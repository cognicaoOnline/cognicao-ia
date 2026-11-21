-- ============================================================================
-- Cognição-IA — Schema SQL Completo para Supabase (Prefixo cog_)
-- Seguro para rodar em banco novo OU já existente (idempotente).
-- Cole este conteúdo no SQL Editor do Supabase e clique em RUN.
-- ============================================================================

-- 1. Extensão para UUIDs
create extension if not exists "pgcrypto";

-- 2. Perfis de Usuário (vinculado ao auth.users do Supabase)
create table if not exists public.cog_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- Trigger para criar perfil automaticamente ao cadastrar usuário
create or replace function public.cog_handle_new_user()
returns trigger as $$
begin
  insert into public.cog_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists cog_on_auth_user_created on auth.users;
create trigger cog_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.cog_handle_new_user();

-- 3. Workspaces (Cada Cliente / Agente de IA)
create table if not exists public.cog_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid references public.cog_profiles(id) on delete set null,
  owner_email text,
  embed_token text not null default replace(gen_random_uuid()::text, '-', ''),
  n8n_webhook_url text,
  created_at timestamptz not null default now()
);

alter table public.cog_workspaces add column if not exists owner_email text;
alter table public.cog_workspaces add column if not exists n8n_webhook_url text;

-- 4. Blocos de Conhecimento / Prompt Modular
create table if not exists public.cog_knowledge_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cog_workspaces(id) on delete cascade,
  category text not null default 'knowledge' check (category in ('knowledge', 'actions', 'instructions', 'files')),
  title text not null,
  content_md text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_locked_for_client boolean not null default false,
  client_can_edit boolean not null default true,
  client_can_delete boolean not null default false,
  removal_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cog_knowledge_blocks add column if not exists removal_requested boolean not null default false;

-- 5. Arquivos Anexados (PDF, DOC, TXT)
create table if not exists public.cog_knowledge_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cog_workspaces(id) on delete cascade,
  file_name text not null,
  file_size integer,
  extracted_md text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'error')),
  created_at timestamptz not null default now()
);

-- 6. Função auxiliar segura para checar se o usuário logado é admin (evita recursão de RLS)
create or replace function public.cog_is_admin()
returns boolean as $$
  select exists (
    select 1 from public.cog_profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 7. View pronta para o n8n consultar o prompt montado em 1 só chamada!
create or replace view public.v_cog_n8n_prompts as
select
  w.id as workspace_id,
  w.slug as workspace_slug,
  w.name as workspace_name,
  w.embed_token,
  coalesce(
    string_agg(
      '### ' || b.title || E'\n' ||
      regexp_replace(
        regexp_replace(b.content_md, '\[\[OCULTO\]\]', '', 'g'),
        '\[\[/OCULTO\]\]', '', 'g'
      ),
      E'\n\n---\n\n' order by b.sort_order asc, b.created_at asc
    ),
    ''
  ) as full_prompt_md
from public.cog_workspaces w
left join public.cog_knowledge_blocks b
  on b.workspace_id = w.id and b.is_active = true
group by w.id, w.slug, w.name, w.embed_token;

-- 8. Row Level Security (RLS)
alter table public.cog_profiles enable row level security;
alter table public.cog_workspaces enable row level security;
alter table public.cog_knowledge_blocks enable row level security;
alter table public.cog_knowledge_files enable row level security;

-- Limpa políticas antigas para recriar sem duplicidade
drop policy if exists "cog_profiles_select" on public.cog_profiles;
drop policy if exists "cog_workspaces_select" on public.cog_workspaces;
drop policy if exists "cog_workspaces_all" on public.cog_workspaces;
drop policy if exists "cog_blocks_all" on public.cog_knowledge_blocks;
drop policy if exists "cog_files_all" on public.cog_knowledge_files;

-- Perfis: usuário vê o próprio perfil; admin vê todos os perfis (para vincular clientes)
create policy "cog_profiles_select" on public.cog_profiles
  for select using (
    auth.uid() = id or public.cog_is_admin()
  );

-- Workspaces: admin vê/gerencia tudo; cliente vê/acessa onde é owner_id OU owner_email
create policy "cog_workspaces_select" on public.cog_workspaces
  for select using (
    owner_id = auth.uid()
    or (owner_email is not null and lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
    or public.cog_is_admin()
  );

create policy "cog_workspaces_all" on public.cog_workspaces
  for all using (
    owner_id = auth.uid()
    or (owner_email is not null and lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
    or public.cog_is_admin()
  )
  with check (
    owner_id = auth.uid()
    or (owner_email is not null and lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
    or public.cog_is_admin()
  );

-- Blocos: acesso se tiver acesso ao workspace pai ou for admin
create policy "cog_blocks_all" on public.cog_knowledge_blocks
  for all using (
    exists (
      select 1 from public.cog_workspaces w
      where w.id = workspace_id
        and (
          w.owner_id = auth.uid()
          or (w.owner_email is not null and lower(w.owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
          or public.cog_is_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from public.cog_workspaces w
      where w.id = workspace_id
        and (
          w.owner_id = auth.uid()
          or (w.owner_email is not null and lower(w.owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
          or public.cog_is_admin()
        )
    )
  );

-- Arquivos: acesso se tiver acesso ao workspace pai ou for admin
create policy "cog_files_all" on public.cog_knowledge_files
  for all using (
    exists (
      select 1 from public.cog_workspaces w
      where w.id = workspace_id
        and (
          w.owner_id = auth.uid()
          or (w.owner_email is not null and lower(w.owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
          or public.cog_is_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from public.cog_workspaces w
      where w.id = workspace_id
        and (
          w.owner_id = auth.uid()
          or (w.owner_email is not null and lower(w.owner_email) = lower(coalesce(auth.jwt()->>'email', '')))
          or public.cog_is_admin()
        )
    )
  );
