import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Lock, Unlock, Trash2, FileText, Sparkles, Link2, Terminal,
  ArrowUp, ArrowDown, RotateCcw, AlertTriangle, Check, Cloud, CloudOff,
  Loader2, RefreshCw, X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { CATEGORIES, buildStarterBlocks } from './lib/defaultTemplates';
import {
  loadDemoState,
  saveDemoState,
  saveBlockDraft,
  clearBlockDraft,
  fetchInitialData,
  saveBlockToSupabase,
  createBlockInSupabase,
  deleteBlockInSupabase,
  saveBlockOrdersInSupabase,
  createWorkspaceInSupabase,
  updateWorkspaceInSupabase,
  deleteWorkspaceInSupabase,
  assignWorkspaceAccessInSupabase,
  createClientAccountInSupabase,
  fetchRegisteredProfiles,
} from './lib/persistence';
import { ColoredMarkdown } from './components/ColoredMarkdown';
import { LivePromptEditor } from './components/LivePromptEditor';
import { AuthScreen } from './components/AuthScreen';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { AdminOverview } from './components/AdminOverview';
import {
  NewWorkspaceModal,
  NewClientModal,
  AccessModal,
  PromptModal,
  ConfirmModal,
} from './components/Modals';

export default function App() {
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [dataLoading, setDataLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  const [userRole, setUserRole] = useState('admin');
  const [previewAsClient, setPreviewAsClient] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'overview'

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [registeredProfiles, setRegisteredProfiles] = useState([]);

  const [clientEditing, setClientEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirtyBlockIds, setDirtyBlockIds] = useState(() => new Set());
  const [errorBanner, setErrorBanner] = useState(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Modais
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [accessTargetWs, setAccessTargetWs] = useState(null);
  const [promptTargetWs, setPromptTargetWs] = useState(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState(null);
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(null);

  const textareaRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const dirtyIdsRef = useRef(new Set());
  const saveTimersRef = useRef({});

  const isCloudMode = isSupabaseConfigured && Boolean(session?.user) && !demoMode;
  const isClientView = userRole === 'client' || (userRole === 'admin' && previewAsClient);

  // 1. Sessão Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Carrega dados iniciais (Supabase OU Demo em localStorage)
  useEffect(() => {
    if (demoMode) {
      const demo = loadDemoState();
      setWorkspaces(demo.workspaces);
      setBlocks(demo.blocks);
      const firstWsId = demo.workspaces[0]?.id || null;
      setActiveWorkspaceId(firstWsId);
      const firstBlk = demo.blocks.find((b) => b.workspace_id === firstWsId);
      setSelectedBlockId(firstBlk?.id || null);
      setUserRole('admin');
      return;
    }

    if (!isSupabaseConfigured || !session?.user) return;

    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      setErrorBanner(null);
      const res = await fetchInitialData(session.user);
      if (cancelled) return;

      if (res.error) {
        setErrorBanner(res.error);
        setDataLoading(false);
        return;
      }

      setUserRole(res.role);
      setWorkspaces(res.workspaces);
      setBlocks(res.blocks);
      setRegisteredProfiles(res.registeredProfiles || []);

      const savedWsKey = `cognicao_ia_last_ws_${session.user.id}`;
      const preferredWsId = localStorage.getItem(savedWsKey);
      const validWs =
        res.workspaces.find((w) => w.id === preferredWsId) || res.workspaces[0] || null;
      const wsId = validWs?.id || null;
      setActiveWorkspaceId(wsId);

      const firstBlk = res.blocks.find((b) => b.workspace_id === wsId);
      setSelectedBlockId(firstBlk?.id || null);
      setDataLoading(false);

      // Se havia rascunhos locais recuperados pós-F5, sincroniza com a nuvem imediatamente
      if (res.recoveredIds && res.recoveredIds.length > 0) {
        const nextDirty = new Set(res.recoveredIds);
        dirtyIdsRef.current = nextDirty;
        setDirtyBlockIds(nextDirty);
        setSaveStatus('saving');
        for (const blkId of res.recoveredIds) {
          const blk = res.blocks.find((b) => b.id === blkId);
          if (blk) {
            const saved = await saveBlockToSupabase(blk);
            if (saved.error) {
              setErrorBanner(`Erro ao sincronizar rascunho: ${saved.error}`);
              setSaveStatus('error');
            }
          }
        }
        dirtyIdsRef.current = new Set();
        setDirtyBlockIds(new Set());
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session, demoMode]);

  // Persiste Demo Mode automaticamente no localStorage
  useEffect(() => {
    if (demoMode && workspaces.length > 0) {
      saveDemoState(workspaces, blocks);
    }
  }, [demoMode, workspaces, blocks]);

  // Lembra último workspace selecionado
  useEffect(() => {
    if (isCloudMode && activeWorkspaceId && session?.user?.id) {
      localStorage.setItem(`cognicao_ia_last_ws_${session.user.id}`, activeWorkspaceId);
    }
  }, [isCloudMode, activeWorkspaceId, session?.user?.id]);

  // Função central de persistência de 1 bloco no Supabase
  const persistBlock = useCallback(
    async (blockId, explicitBlock = null) => {
      const target = explicitBlock || blocksRef.current.find((b) => b.id === blockId);
      if (!target) return true;

      if (!isCloudMode) {
        clearBlockDraft(blockId);
        dirtyIdsRef.current.delete(blockId);
        setDirtyBlockIds(new Set(dirtyIdsRef.current));
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        return true;
      }

      setSaveStatus('saving');
      const { data, error } = await saveBlockToSupabase(target);
      if (error) {
        setSaveStatus('error');
        setErrorBanner(`Não foi possível salvar "${target.title}": ${error}`);
        return false;
      }

      if (data) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === data.id ? { ...b, ...data } : b))
        );
      }

      dirtyIdsRef.current.delete(blockId);
      setDirtyBlockIds(new Set(dirtyIdsRef.current));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      return true;
    },
    [isCloudMode]
  );

  // Salva imediatamente todas as alterações pendentes
  const flushPendingSaves = useCallback(async () => {
    Object.values(saveTimersRef.current).forEach((t) => clearTimeout(t));
    saveTimersRef.current = {};

    const pendingIds = Array.from(dirtyIdsRef.current);
    if (pendingIds.length === 0) return true;

    let allOk = true;
    for (const id of pendingIds) {
      const ok = await persistBlock(id);
      if (!ok) allOk = false;
    }
    return allOk;
  }, [persistBlock]);

  // Aviso ao fechar aba apenas se houver pendência não salva
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirtyBlockIds.size > 0 && isCloudMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyBlockIds, isCloudMode]);

  // Atalho Ctrl+S / Cmd+S para salvar na hora
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flushPendingSaves();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flushPendingSaves]);

  // Atualização com Auto-Save (debounce 900ms) + backup instantâneo em localStorage
  const updateBlockWithAutoSave = (id, patch, immediate = false) => {
    let updatedSnapshot = null;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        updatedSnapshot = { ...b, ...patch };
        return updatedSnapshot;
      })
    );

    if (updatedSnapshot) {
      saveBlockDraft(id, {
        title: updatedSnapshot.title,
        content_md: updatedSnapshot.content_md,
        category: updatedSnapshot.category,
      });
    }

    dirtyIdsRef.current.add(id);
    setDirtyBlockIds(new Set(dirtyIdsRef.current));
    setSaveStatus(immediate ? 'saving' : 'pending');

    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
    }

    if (immediate) {
      persistBlock(id, updatedSnapshot);
    } else {
      saveTimersRef.current[id] = setTimeout(() => {
        delete saveTimersRef.current[id];
        persistBlock(id);
      }, 900);
    }
  };

  // Estados de carregamento / login
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <p className="text-xs">Carregando seus agentes e blocos...</p>
      </div>
    );
  }

  if (isSupabaseConfigured && !session && !demoMode) {
    return <AuthScreen onDemoLogin={() => setDemoMode(true)} />;
  }
  if (!isSupabaseConfigured && !demoMode) {
    return <AuthScreen onDemoLogin={() => setDemoMode(true)} />;
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;
  const workspaceBlocks = blocks
    .filter((b) => activeWorkspace && b.workspace_id === activeWorkspace.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const filteredBlocks = workspaceBlocks.filter(
    (b) => activeCategory === 'all' || b.category === activeCategory
  );

  const selectedBlock =
    workspaceBlocks.find((b) => b.id === selectedBlockId) || filteredBlocks[0] || null;

  const handleSelectWorkspace = async (wsId) => {
    await flushPendingSaves();
    setActiveWorkspaceId(wsId);
    setClientEditing(false);
    const first = blocksRef.current
      .filter((b) => b.workspace_id === wsId)
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    setSelectedBlockId(first?.id || null);
  };

  const handleSelectBlock = async (blkId) => {
    if (blkId === selectedBlockId) return;
    await flushPendingSaves();
    setClientEditing(false);
    setSelectedBlockId(blkId);
  };

  const handleAddBlock = async () => {
    if (!activeWorkspace) return;
    await flushPendingSaves();

    const maxOrder = workspaceBlocks.reduce((acc, b) => Math.max(acc, b.sort_order || 0), 0);
    const newBlockPayload = {
      workspace_id: activeWorkspace.id,
      category: activeCategory === 'all' ? 'knowledge' : activeCategory,
      title: 'Novo Bloco de Conhecimento',
      sort_order: maxOrder + 1,
      is_active: true,
      is_locked_for_client: false,
      client_can_edit: true,
      client_can_delete: false,
      removal_requested: false,
      content_md: `# Título do Bloco\nEscreva aqui as informações que a IA deve saber...`,
    };

    if (isCloudMode) {
      const { data, error } = await createBlockInSupabase(newBlockPayload);
      if (error || !data) {
        setErrorBanner(`Erro ao criar bloco: ${error}`);
        return;
      }
      setBlocks((prev) => [...prev, data]);
      setSelectedBlockId(data.id);
      setClientEditing(isClientView);
      return;
    }

    const localBlock = { ...newBlockPayload, id: `blk-${Date.now()}` };
    setBlocks((prev) => [...prev, localBlock]);
    setSelectedBlockId(localBlock.id);
    setClientEditing(isClientView);
  };

  const handleDeleteBlockConfirmed = async () => {
    const blk = confirmDeleteBlock;
    if (!blk) return;
    setConfirmDeleteBlock(null);

    if (saveTimersRef.current[blk.id]) {
      clearTimeout(saveTimersRef.current[blk.id]);
      delete saveTimersRef.current[blk.id];
    }

    if (isCloudMode) {
      const { error } = await deleteBlockInSupabase(blk.id);
      if (error) {
        setErrorBanner(`Erro ao excluir bloco: ${error}`);
        return;
      }
    } else {
      clearBlockDraft(blk.id);
    }

    setBlocks((prev) => prev.filter((b) => b.id !== blk.id));
    if (selectedBlockId === blk.id) setSelectedBlockId(null);
  };

  const handleMoveBlock = async (id, direction) => {
    const sorted = [...filteredBlocks];
    const idx = sorted.findIndex((b) => b.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    const newOrderMap = new Map();
    reordered.forEach((b, i) => {
      newOrderMap.set(b.id, i + 1);
    });

    const pairs = [];
    setBlocks((prev) =>
      prev.map((b) => {
        if (!newOrderMap.has(b.id)) return b;
        const nextOrder = newOrderMap.get(b.id);
        pairs.push({ id: b.id, sort_order: nextOrder });
        return { ...b, sort_order: nextOrder };
      })
    );

    if (isCloudMode && pairs.length > 0) {
      setSaveStatus('saving');
      const { error } = await saveBlockOrdersInSupabase(pairs);
      if (error) {
        setSaveStatus('error');
        setErrorBanner(`Erro ao salvar nova ordem: ${error}`);
      } else {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }
    }
  };

  const handleBlurSelection = () => {
    const el = textareaRef.current;
    if (!el || !selectedBlock) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const text = selectedBlock.content_md;
    const selected = text.slice(start, end);
    const updated = text.slice(0, start) + `[[OCULTO]]\n${selected}\n[[/OCULTO]]` + text.slice(end);
    updateBlockWithAutoSave(selectedBlock.id, { content_md: updated }, true);
  };

  const handleFileUpload = (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !activeWorkspace) return;

    const createFileBlock = async (content) => {
      const maxOrder = workspaceBlocks.reduce((acc, b) => Math.max(acc, b.sort_order || 0), 0);
      const payload = {
        workspace_id: activeWorkspace.id,
        category: 'files',
        title: `Arquivo: ${file.name}`,
        sort_order: maxOrder + 1,
        is_active: true,
        is_locked_for_client: false,
        client_can_edit: true,
        client_can_delete: true,
        removal_requested: false,
        content_md: content,
      };

      if (isCloudMode) {
        const { data, error } = await createBlockInSupabase(payload);
        if (error || !data) {
          setErrorBanner(`Erro ao salvar arquivo: ${error}`);
          return;
        }
        setBlocks((prev) => [...prev, data]);
        setSelectedBlockId(data.id);
        setViewMode('editor');
        setActiveCategory('files');
      } else {
        const localBlock = { ...payload, id: `blk-file-${Date.now()}` };
        setBlocks((prev) => [...prev, localBlock]);
        setSelectedBlockId(localBlock.id);
        setViewMode('editor');
        setActiveCategory('files');
      }
      input.value = '';
    };

    if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = () => {
        createFileBlock(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.readAsText(file);
    } else {
      createFileBlock(
        `# Conteúdo do arquivo: ${file.name}\n\n*(Arquivo anexado — cole aqui os trechos principais ou resumos que a IA deve consultar.)*`
      );
    }
  };

  const handleCreateWorkspace = async ({ name, ownerEmail, includeStarter }) => {
    await flushPendingSaves();

    if (isCloudMode) {
      const res = await createWorkspaceInSupabase({
        name,
        ownerEmail,
        includeStarterBlocks: includeStarter,
        currentUserId: session.user.id,
        registeredProfiles,
      });

      if (res.error) {
        setErrorBanner(res.error);
      }
      if (res.workspace) {
        setWorkspaces((prev) => [...prev, res.workspace]);
        if (res.blocks?.length) {
          setBlocks((prev) => [...prev, ...res.blocks]);
        }
        setActiveWorkspaceId(res.workspace.id);
        setSelectedBlockId(res.blocks?.[0]?.id || null);
        setViewMode('editor');
        setActiveCategory('all');
      }
      setShowNewWsModal(false);
      return;
    }

    const newWsId = `ws-${Date.now()}`;
    const newWs = {
      id: newWsId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      owner_email: ownerEmail || null,
      embed_token: `tok-${Date.now()}`,
    };
    const starter = includeStarter
      ? buildStarterBlocks(newWsId, false).map((b, i) => ({ ...b, id: `blk-${Date.now()}-${i}` }))
      : [];

    setWorkspaces((prev) => [...prev, newWs]);
    if (starter.length) setBlocks((prev) => [...prev, ...starter]);
    setActiveWorkspaceId(newWsId);
    setSelectedBlockId(starter[0]?.id || null);
    setViewMode('editor');
    setActiveCategory('all');
    setShowNewWsModal(false);
  };

  const handleRenameWorkspace = async (wsId, newName) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === wsId ? { ...w, name: newName } : w)));
    if (isCloudMode) {
      const { error } = await updateWorkspaceInSupabase(wsId, { name: newName });
      if (error) setErrorBanner(`Erro ao renomear agente: ${error}`);
    }
  };

  const handleDeleteWorkspaceConfirmed = async () => {
    const ws = confirmDeleteWs;
    if (!ws) return;
    setConfirmDeleteWs(null);

    if (isCloudMode) {
      const { error } = await deleteWorkspaceInSupabase(ws.id);
      if (error) {
        setErrorBanner(`Erro ao excluir agente: ${error}`);
        return;
      }
    }

    const remaining = workspaces.filter((w) => w.id !== ws.id);
    setWorkspaces(remaining);
    setBlocks((prev) => prev.filter((b) => b.workspace_id !== ws.id));
    if (activeWorkspaceId === ws.id) {
      const nextWs = remaining[0] || null;
      setActiveWorkspaceId(nextWs?.id || null);
      setSelectedBlockId(null);
    }
  };

  const handleSaveAccess = async (wsId, email) => {
    if (isCloudMode) {
      const res = await assignWorkspaceAccessInSupabase({
        workspaceId: wsId,
        email,
        currentAdminId: session.user.id,
        registeredProfiles,
      });
      if (res.error) {
        setErrorBanner(`Erro ao salvar acesso: ${res.error}`);
        return;
      }
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === wsId
            ? {
                ...w,
                owner_email: email || null,
                owner_id: res.data?.owner_id ?? w.owner_id,
              }
            : w
        )
      );
    } else {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === wsId ? { ...w, owner_email: email || null } : w))
      );
    }
    setAccessTargetWs(null);
  };

  const handleCreateClientAccount = async ({ fullName, email, password, assignWorkspaceId }) => {
    if (!isCloudMode) {
      const localProfile = {
        id: `cli-${Date.now()}`,
        email: email.toLowerCase(),
        full_name: fullName || email.split('@')[0],
        role: 'client',
      };
      setRegisteredProfiles((prev) => [...prev, localProfile]);
      if (assignWorkspaceId) {
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === assignWorkspaceId ? { ...w, owner_email: localProfile.email, owner_id: localProfile.id } : w
          )
        );
      }
      return { profile: localProfile, needsEmailConfirm: false, error: null };
    }

    const res = await createClientAccountInSupabase({ fullName, email, password });
    if (res.error || !res.profile) {
      return res;
    }

    const updatedProfiles = [...registeredProfiles, res.profile];
    setRegisteredProfiles(updatedProfiles);

    if (assignWorkspaceId) {
      const linkRes = await assignWorkspaceAccessInSupabase({
        workspaceId: assignWorkspaceId,
        email: res.profile.email,
        currentAdminId: session.user.id,
        registeredProfiles: updatedProfiles,
      });
      if (!linkRes.error) {
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === assignWorkspaceId
              ? {
                  ...w,
                  owner_email: res.profile.email,
                  owner_id: linkRes.data?.owner_id ?? res.profile.id,
                }
              : w
          )
        );
      }
    }

    // Sincroniza lista oficial de perfis do banco
    const listRes = await fetchRegisteredProfiles();
    if (!listRes.error && listRes.profiles.length > 0) {
      setRegisteredProfiles(listRes.profiles);
    }

    return res;
  };

  const assemblePromptForWorkspace = (wsId) =>
    blocks
      .filter((b) => b.workspace_id === wsId && b.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        (b) =>
          `### ${b.title}\n${b.content_md.replace(/\[\[OCULTO\]\]|\[\[\/OCULTO\]\]/g, '').trim()}`
      )
      .join('\n\n---\n\n');

  const copyEmbedLink = (ws) => {
    navigator.clipboard.writeText(`${window.location.origin}/?embed=${ws.embed_token}`);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const renderSavePill = () => {
    if (saveStatus === 'saving') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-sky-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
        </span>
      );
    }
    if (saveStatus === 'pending' || dirtyBlockIds.size > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400">
          <Cloud className="w-3 h-3" /> Salvando em instantes...
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <button
          onClick={flushPendingSaves}
          className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline cursor-pointer"
        >
          <CloudOff className="w-3 h-3" /> Falha ao salvar (Tentar de novo)
        </button>
      );
    }
    if (saveStatus === 'saved' && lastSavedAt) {
      const time = lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
          <Check className="w-3 h-3" /> Salvo {isCloudMode ? 'na nuvem' : 'localmente'} • {time}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-screen flex bg-[#0d0d0f] text-zinc-100 overflow-hidden">
      <WorkspaceSidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        activeWorkspaceId={activeWorkspace?.id}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenNewWorkspace={() => setShowNewWsModal(true)}
        onOpenNewClient={() => setShowNewClientModal(true)}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        workspaceBlocks={workspaceBlocks}
        allBlocks={blocks}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onFileUpload={handleFileUpload}
        userRole={userRole}
        userEmail={session?.user?.email}
        isClientView={isClientView}
        previewAsClient={previewAsClient}
        onTogglePreviewAsClient={() => setPreviewAsClient(!previewAsClient)}
        onSignOut={async () => {
          await flushPendingSaves();
          if (isSupabaseConfigured) await supabase.auth.signOut();
          setDemoMode(false);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {errorBanner && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={flushPendingSaves}
                className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 hover:bg-rose-500/30 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Tentar salvar
              </button>
              <button
                onClick={() => setErrorBanner(null)}
                className="p-0.5 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {!activeWorkspace ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-10 h-10 text-zinc-600 mb-3" />
            <h2 className="text-base font-semibold text-white">
              {userRole === 'client'
                ? 'Nenhum agente vinculado ao seu usuário'
                : 'Nenhum agente criado ainda'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              {userRole === 'client'
                ? 'Peça para o administrador liberar o acesso do seu e-mail no painel.'
                : 'Crie seu primeiro agente de IA para organizar o conhecimento e conectar no n8n.'}
            </p>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowNewWsModal(true)}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Agente
              </button>
            )}
          </div>
        ) : viewMode === 'overview' && !isClientView ? (
          <AdminOverview
            workspaces={workspaces}
            blocks={blocks}
            onSelectWorkspace={(wsId) => {
              handleSelectWorkspace(wsId);
              setViewMode('editor');
            }}
            onOpenNewWorkspace={() => setShowNewWsModal(true)}
            onOpenNewClient={() => setShowNewClientModal(true)}
            onOpenAccessModal={(ws) => setAccessTargetWs(ws)}
            onOpenPromptModal={async (ws) => {
              await flushPendingSaves();
              setPromptTargetWs(ws);
            }}
            onRenameWorkspace={handleRenameWorkspace}
            onDeleteWorkspace={(ws) => setConfirmDeleteWs(ws)}
          />
        ) : (
          <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* Lista de Blocos */}
            <section className="w-72 border-r border-zinc-800/80 bg-[#101013] flex flex-col shrink-0">
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Blocos ({filteredBlocks.length})
                </h2>
                <button
                  onClick={handleAddBlock}
                  className="flex items-center gap-1 rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 px-2.5 py-1 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo
                </button>
              </div>

              <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                {filteredBlocks.map((block) => {
                  const cat = CATEGORIES.find((c) => c.id === block.category);
                  const isSelected = selectedBlock?.id === block.id;
                  const isDirty = dirtyBlockIds.has(block.id);

                  return (
                    <div
                      key={block.id}
                      onClick={() => handleSelectBlock(block.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-800/80 border-zinc-700'
                          : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase ${cat?.color || 'text-zinc-400'}`}>
                          #{block.sort_order} • {cat?.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {isDirty && (
                            <span
                              title="Alteração pendente de salvamento"
                              className="w-1.5 h-1.5 rounded-full bg-amber-400"
                            />
                          )}
                          {!isClientView && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlock(block.id, 'up');
                                }}
                                title="Subir ordem"
                                className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlock(block.id, 'down');
                                }}
                                title="Descer ordem"
                                className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {block.is_locked_for_client && (
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-zinc-100 truncate">{block.title}</div>
                      {(block.removal_requested || (!block.is_active && isClientView)) && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-rose-400">
                          <AlertTriangle className="w-3 h-3" /> Remoção solicitada (Oculto p/ IA)
                        </div>
                      )}
                      {!block.is_active && !block.removal_requested && !isClientView && (
                        <div className="mt-1 text-[10px] text-zinc-500">Inativo (Fora da IA)</div>
                      )}
                    </div>
                  );
                })}
                {filteredBlocks.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    Nenhum bloco nesta categoria. Clique em <strong>+ Novo</strong> para criar.
                  </div>
                )}
              </div>
            </section>

            {/* Área Principal */}
            <main className="flex-1 flex flex-col min-w-0">
              <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between gap-4 bg-[#121215]">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">
                    {selectedBlock ? selectedBlock.title : activeWorkspace.name}
                  </span>
                  <div className="hidden sm:block">{renderSavePill()}</div>
                </div>

                {!isClientView && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setAccessTargetWs(activeWorkspace)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-sky-400" />
                      Acesso do Cliente
                    </button>

                    <button
                      onClick={() => copyEmbedLink(activeWorkspace)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 cursor-pointer"
                    >
                      {copiedEmbed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      {copiedEmbed ? 'Link Copiado!' : 'Link de Integração'}
                    </button>

                    <button
                      onClick={async () => {
                        await flushPendingSaves();
                        setPromptTargetWs(activeWorkspace);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Testar Prompt Unificado
                    </button>
                  </div>
                )}
              </header>

              {selectedBlock ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Controles do Bloco */}
                  {(!isClientView || (selectedBlock.client_can_edit && !selectedBlock.is_locked_for_client)) && (
                    <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                      <input
                        type="text"
                        value={selectedBlock.title}
                        onChange={(e) =>
                          updateBlockWithAutoSave(selectedBlock.id, { title: e.target.value })
                        }
                        className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                      />

                      {!isClientView && (
                        <>
                          <select
                            value={selectedBlock.category}
                            onChange={(e) =>
                              updateBlockWithAutoSave(
                                selectedBlock.id,
                                { category: e.target.value },
                                true
                              )
                            }
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none cursor-pointer"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={handleBlurSelection}
                            title="Selecione um trecho no texto abaixo e clique aqui para borrar para o cliente"
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" /> Borrar Seleção
                          </button>

                          <button
                            onClick={() =>
                              updateBlockWithAutoSave(
                                selectedBlock.id,
                                { is_locked_for_client: !selectedBlock.is_locked_for_client },
                                true
                              )
                            }
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                              selectedBlock.is_locked_for_client
                                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                            }`}
                          >
                            {selectedBlock.is_locked_for_client ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                            {selectedBlock.is_locked_for_client
                              ? 'Bloco Oculto p/ Cliente'
                              : 'Visível p/ Cliente'}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => persistBlock(selectedBlock.id)}
                        disabled={saveStatus === 'saving'}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {saveStatus === 'saved' && !dirtyBlockIds.has(selectedBlock.id) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : null}
                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar agora'}
                      </button>

                      {!isClientView ? (
                        <div className="flex items-center gap-1.5">
                          {(selectedBlock.removal_requested || !selectedBlock.is_active) && (
                            <button
                              onClick={() =>
                                updateBlockWithAutoSave(
                                  selectedBlock.id,
                                  { removal_requested: false, is_active: true },
                                  true
                                )
                              }
                              title="Restaurar bloco para a IA"
                              className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteBlock(selectedBlock)}
                            title="Apagar definitivamente"
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : !selectedBlock.removal_requested && selectedBlock.is_active ? (
                        <button
                          onClick={() => {
                            updateBlockWithAutoSave(
                              selectedBlock.id,
                              { removal_requested: true, is_active: false },
                              true
                            );
                            setClientEditing(false);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Solicitar remoção
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateBlockWithAutoSave(
                              selectedBlock.id,
                              { removal_requested: false, is_active: true },
                              true
                            )
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Cancelar remoção
                        </button>
                      )}
                    </div>
                  )}

                  {/* Editor Colorido ao Vivo (Admin) ou Visão Protegida do Cliente */}
                  {!isClientView ||
                  (clientEditing && selectedBlock.client_can_edit && !selectedBlock.is_locked_for_client) ? (
                    <div className="flex flex-col">
                      <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          {isClientView
                            ? 'Editando Informações (salvamento automático ativo)'
                            : 'Editor Colorido ao Vivo (Markdown • salvamento automático)'}
                        </span>
                        {isClientView ? (
                          <button
                            onClick={async () => {
                              await flushPendingSaves();
                              setClientEditing(false);
                            }}
                            className="text-xs text-sky-400 hover:underline cursor-pointer"
                          >
                            Concluir edição
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500">
                            # Azul • - / 1. Verde • "Falas" Laranja • [[OCULTO]] Borrado p/ cliente
                          </span>
                        )}
                      </div>
                      <LivePromptEditor
                        textareaRef={textareaRef}
                        value={
                          isClientView
                            ? selectedBlock.content_md.replace(
                                /(?:\r?\n)*\[\[OCULTO\]\][\s\S]*?\[\[\/OCULTO\]\]/g,
                                ''
                              )
                            : selectedBlock.content_md
                        }
                        onChange={(val) => {
                          if (!isClientView) {
                            updateBlockWithAutoSave(selectedBlock.id, { content_md: val });
                          } else {
                            const secrets =
                              selectedBlock.content_md.match(/\[\[OCULTO\]\][\s\S]*?\[\[\/OCULTO\]\]/g) || [];
                            const merged = secrets.length ? `${val}\n\n${secrets.join('\n\n')}` : val;
                            updateBlockWithAutoSave(selectedBlock.id, { content_md: merged });
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          Visualização do Bloco
                        </span>
                        {selectedBlock.client_can_edit && !selectedBlock.is_locked_for_client && (
                          <button
                            onClick={() => setClientEditing(true)}
                            className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 text-xs font-medium text-sky-400 hover:bg-sky-500/25 cursor-pointer"
                          >
                            Editar informações
                          </button>
                        )}
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-[#141417] p-5 min-h-[340px]">
                        <ColoredMarkdown
                          content={selectedBlock.content_md}
                          isClientView={isClientView}
                          isBlockLocked={selectedBlock.is_locked_for_client}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
                  Selecione ou crie um bloco na barra lateral.
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Modais */}
      {showNewWsModal && (
        <NewWorkspaceModal
          registeredProfiles={registeredProfiles}
          onClose={() => setShowNewWsModal(false)}
          onCreate={handleCreateWorkspace}
        />
      )}

      {showNewClientModal && (
        <NewClientModal
          workspaces={workspaces}
          registeredProfiles={registeredProfiles}
          onClose={() => setShowNewClientModal(false)}
          onCreateClient={handleCreateClientAccount}
        />
      )}

      {accessTargetWs && (
        <AccessModal
          workspace={accessTargetWs}
          registeredProfiles={registeredProfiles}
          onClose={() => setAccessTargetWs(null)}
          onSave={handleSaveAccess}
          onCreateClient={handleCreateClientAccount}
        />
      )}

      {promptTargetWs && (
        <PromptModal
          workspace={promptTargetWs}
          assembledPrompt={assemblePromptForWorkspace(promptTargetWs.id)}
          onClose={() => setPromptTargetWs(null)}
        />
      )}

      {confirmDeleteBlock && (
        <ConfirmModal
          title="Excluir bloco definitivamente?"
          description={`O bloco "${confirmDeleteBlock.title}" será removido permanentemente do agente e do Supabase.`}
          confirmLabel="Excluir bloco"
          onCancel={() => setConfirmDeleteBlock(null)}
          onConfirm={handleDeleteBlockConfirmed}
        />
      )}

      {confirmDeleteWs && (
        <ConfirmModal
          title="Excluir agente e todos os blocos?"
          description={`Tem certeza que deseja excluir "${confirmDeleteWs.name}"? Todos os blocos vinculados serão apagados.`}
          confirmLabel="Excluir agente"
          onCancel={() => setConfirmDeleteWs(null)}
          onConfirm={handleDeleteWorkspaceConfirmed}
        />
      )}
    </div>
  );
}
