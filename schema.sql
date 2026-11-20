-- ============================================================================
-- Cognição-IA — Schema SQL para Supabase
-- Cole este conteúdo no SQL Editor do seu projeto Supabase e execute (Run).
-- ============================================================================

-- 1. Extensão para UUIDs
create extension if not exists "pgcrypto";

-- 2. Perfis de Usuário (vinculado ao auth.users do Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

-- Trigger para criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Workspaces (Cada Cliente / Agente de IA)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid references public.profiles(id) on delete set null,
  embed_token text not null default replace(gen_random_uuid()::text, '-', ''),
  n8n_webhook_url text,
  created_at timestamptz not null default now()
);

-- 4. Blocos de Conhecimento / Prompt Modular
create table if not exists public.knowledge_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category text not null default 'knowledge' check (category in ('knowledge', 'actions', 'instructions', 'files')),
  title text not null,
  content_md text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_locked_for_client boolean not null default false, -- Se true, o bloco inteiro fica borrado para o cliente
  client_can_edit boolean not null default true,
  client_can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Arquivos Anexados (PDF, DOC, TXT)
create table if not exists public.knowledge_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_name text not null,
  file_size integer,
  extracted_md text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'error')),
  created_at timestamptz not null default now()
);

-- 6. View pronta para o n8n / MCP consultar o prompt montado em 1 só chamada!
create or replace view public.v_n8n_prompts as
select
  w.id as workspace_id,
  w.slug as workspace_slug,
  w.name as workspace_name,
  string_agg(
    '### ' || b.title || E'\n' ||
    regexp_replace(
      regexp_replace(b.content_md, '\[\[OCULTO\]\]', '', 'g'),
      '\[\[/OCULTO\]\]', '', 'g'
    ),
    E'\n\n---\n\n' order by b.sort_order asc, b.created_at asc
  ) as full_prompt_md
from public.workspaces w
left join public.knowledge_blocks b
  on b.workspace_id = w.id and b.is_active = true
group by w.id, w.slug, w.name;

-- 7. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.knowledge_blocks enable row level security;
alter table public.knowledge_files enable row level security;

-- Políticas básicas (Admin vê tudo; Cliente vê apenas seus workspaces)
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins and owners view workspaces" on public.workspaces
  for select using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins and owners manage workspaces" on public.workspaces
  for all using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Access blocks of own workspace or admin" on public.knowledge_blocks
  for all using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and (w.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

create policy "Access files of own workspace or admin" on public.knowledge_files
  for all using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and (w.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );
