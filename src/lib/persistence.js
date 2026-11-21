import { supabase } from './supabase';
import {
  INITIAL_DEMO_WORKSPACES,
  INITIAL_DEMO_BLOCKS,
  buildStarterBlocks,
} from './defaultTemplates';

const DEMO_STORAGE_KEY = 'cognicao_ia_demo_state_v1';
const DRAFTS_STORAGE_KEY = 'cognicao_ia_unsaved_drafts_v1';

const isMissingColumnError = (error, colName) => {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return (
    (error.code === 'PGRST204' || error.code === '42703' || msg.includes('column')) &&
    msg.includes(colName.toLowerCase())
  );
};

// -------------------- Local Demo Persistence --------------------
export function loadDemoState() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.workspaces) && Array.isArray(parsed.blocks)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    workspaces: INITIAL_DEMO_WORKSPACES,
    blocks: INITIAL_DEMO_BLOCKS,
  };
}

export function saveDemoState(workspaces, blocks) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ workspaces, blocks }));
  } catch {
    // ignore quota errors
  }
}

// -------------------- Local Draft Safety Net --------------------
export function loadAllDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBlockDraft(blockId, patch) {
  if (!blockId) return;
  try {
    const drafts = loadAllDrafts();
    drafts[blockId] = {
      ...drafts[blockId],
      ...patch,
      savedLocallyAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore storage errors
  }
}

export function clearBlockDraft(blockId) {
  if (!blockId) return;
  try {
    const drafts = loadAllDrafts();
    if (drafts[blockId]) {
      delete drafts[blockId];
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    }
  } catch {
    // ignore
  }
}

// -------------------- Supabase Operations --------------------
export async function fetchInitialData(user) {
  const { data: profile, error: profErr } = await supabase
    .from('cog_profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr) {
    return { error: `Erro ao carregar perfil: ${profErr.message}` };
  }

  const role = profile?.role || 'client';

  let { data: wsData, error: wsErr } = await supabase
    .from('cog_workspaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (wsErr) {
    return { error: `Erro ao carregar agentes: ${wsErr.message}` };
  }

  let { data: blkData, error: blkErr } = await supabase
    .from('cog_knowledge_blocks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (blkErr) {
    return { error: `Erro ao carregar blocos: ${blkErr.message}` };
  }

  // Se for admin e ainda não existir nenhum agente real no banco, cria 1 inicial real
  if (role === 'admin' && (!wsData || wsData.length === 0)) {
    const created = await createWorkspaceInSupabase({
      name: 'Clínica Exemplo (Inicial)',
      ownerEmail: '',
      includeStarterBlocks: true,
      currentUserId: user.id,
      registeredProfiles: profile ? [profile] : [],
    });
    if (!created.error && created.workspace) {
      wsData = [created.workspace];
      blkData = created.blocks || [];
    }
  }

  let registeredProfiles = [];
  if (role === 'admin') {
    const { data: profilesList } = await supabase
      .from('cog_profiles')
      .select('id, email, full_name, role')
      .order('email', { ascending: true });
    if (profilesList) registeredProfiles = profilesList;
  }

  // Aplica rascunhos locais não sincronizados por cima (recuperação pós-F5)
  const drafts = loadAllDrafts();
  const recoveredIds = [];
  const mergedBlocks = (blkData || []).map((blk) => {
    const draft = drafts[blk.id];
    if (!draft) return blk;
    recoveredIds.push(blk.id);
    return {
      ...blk,
      title: draft.title ?? blk.title,
      content_md: draft.content_md ?? blk.content_md,
      category: draft.category ?? blk.category,
    };
  });

  return {
    role,
    profile,
    workspaces: wsData || [],
    blocks: mergedBlocks,
    registeredProfiles,
    recoveredIds,
    error: null,
  };
}

export async function saveBlockToSupabase(block) {
  const basePayload = {
    title: block.title,
    content_md: block.content_md,
    category: block.category,
    sort_order: block.sort_order,
    is_active: block.is_active,
    is_locked_for_client: Boolean(block.is_locked_for_client),
    client_can_edit: block.client_can_edit ?? true,
    updated_at: new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    removal_requested: Boolean(block.removal_requested),
  };

  let { data, error } = await supabase
    .from('cog_knowledge_blocks')
    .update(fullPayload)
    .eq('id', block.id)
    .select()
    .single();

  if (error && isMissingColumnError(error, 'removal_requested')) {
    const retry = await supabase
      .from('cog_knowledge_blocks')
      .update(basePayload)
      .eq('id', block.id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { data: null, error: error.message };
  }

  clearBlockDraft(block.id);
  return { data, error: null };
}

export async function createBlockInSupabase(newBlock) {
  const { removal_requested, ...withoutRemoval } = newBlock;

  let { data, error } = await supabase
    .from('cog_knowledge_blocks')
    .insert(newBlock)
    .select()
    .single();

  if (error && isMissingColumnError(error, 'removal_requested')) {
    const retry = await supabase
      .from('cog_knowledge_blocks')
      .insert(withoutRemoval)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteBlockInSupabase(blockId) {
  const { error } = await supabase
    .from('cog_knowledge_blocks')
    .delete()
    .eq('id', blockId);

  if (error) return { error: error.message };
  clearBlockDraft(blockId);
  return { error: null };
}

export async function saveBlockOrdersInSupabase(orderPairs) {
  // orderPairs: Array<{ id, sort_order }>
  for (const item of orderPairs) {
    const { error } = await supabase
      .from('cog_knowledge_blocks')
      .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function createWorkspaceInSupabase({
  name,
  ownerEmail = '',
  includeStarterBlocks = true,
  currentUserId = null,
  registeredProfiles = [],
}) {
  const cleanName = name.trim();
  const slug =
    cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Date.now().toString().slice(-4);

  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const matchedProfile = normalizedEmail
    ? registeredProfiles.find((p) => p.email?.toLowerCase() === normalizedEmail)
    : null;

  const baseWs = {
    name: cleanName,
    slug,
    owner_id: matchedProfile?.id || currentUserId || null,
  };

  const fullWs = normalizedEmail
    ? { ...baseWs, owner_email: normalizedEmail }
    : baseWs;

  let { data: wsData, error: wsErr } = await supabase
    .from('cog_workspaces')
    .insert(fullWs)
    .select()
    .single();

  if (wsErr && isMissingColumnError(wsErr, 'owner_email')) {
    const retry = await supabase
      .from('cog_workspaces')
      .insert(baseWs)
      .select()
      .single();
    wsData = retry.data;
    wsErr = retry.error;
  }

  if (wsErr || !wsData) {
    return { workspace: null, blocks: [], error: wsErr?.message || 'Falha ao criar agente.' };
  }

  let createdBlocks = [];
  if (includeStarterBlocks) {
    const starters = buildStarterBlocks(wsData.id, false).map(({ removal_requested, ...rest }) => rest);
    const { data: blkData, error: blkErr } = await supabase
      .from('cog_knowledge_blocks')
      .insert(starters)
      .select();

    if (blkErr) {
      return {
        workspace: wsData,
        blocks: [],
        error: `Agente criado, mas erro ao criar blocos iniciais: ${blkErr.message}`,
      };
    }
    createdBlocks = blkData || [];
  }

  return { workspace: wsData, blocks: createdBlocks, error: null };
}

export async function updateWorkspaceInSupabase(workspaceId, patch) {
  let { data, error } = await supabase
    .from('cog_workspaces')
    .update(patch)
    .eq('id', workspaceId)
    .select()
    .single();

  if (error && isMissingColumnError(error, 'owner_email')) {
    const { owner_email, ...safePatch } = patch;
    const retry = await supabase
      .from('cog_workspaces')
      .update(safePatch)
      .eq('id', workspaceId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteWorkspaceInSupabase(workspaceId) {
  const { error } = await supabase
    .from('cog_workspaces')
    .delete()
    .eq('id', workspaceId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function assignWorkspaceAccessInSupabase({
  workspaceId,
  email,
  currentAdminId,
  registeredProfiles = [],
}) {
  const normalized = (email || '').trim().toLowerCase();

  if (!normalized) {
    return updateWorkspaceInSupabase(workspaceId, {
      owner_id: currentAdminId || null,
      owner_email: null,
    });
  }

  let matched = registeredProfiles.find((p) => p.email?.toLowerCase() === normalized);
  if (!matched) {
    const { data: found } = await supabase
      .from('cog_profiles')
      .select('id, email, full_name, role')
      .ilike('email', normalized)
      .maybeSingle();
    if (found) matched = found;
  }

  const patch = {
    owner_email: normalized,
    owner_id: matched ? matched.id : currentAdminId || null,
  };

  const res = await updateWorkspaceInSupabase(workspaceId, patch);
  return {
    ...res,
    linkedUser: matched || null,
    status: matched ? 'linked' : 'pending_signup',
  };
}
