import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Plus, Lock, Unlock, Eye, EyeOff, Trash2, FileText,
  Sparkles, Copy, Check, LogOut, Upload, Terminal, Link2, ArrowUp, ArrowDown,
  ChevronDown, RotateCcw, AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { CATEGORIES, INITIAL_DEMO_WORKSPACES, INITIAL_DEMO_BLOCKS } from './lib/defaultTemplates';
import { ColoredMarkdown } from './components/ColoredMarkdown';
import { LivePromptEditor } from './components/LivePromptEditor';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [userRole, setUserRole] = useState('admin'); // 'admin' | 'client'
  const [previewAsClient, setPreviewAsClient] = useState(false);

  const [workspaces, setWorkspaces] = useState(INITIAL_DEMO_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(INITIAL_DEMO_WORKSPACES[0].id);
  const [activeCategory, setActiveCategory] = useState('all');
  const [blocks, setBlocks] = useState(INITIAL_DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState(INITIAL_DEMO_BLOCKS[0].id);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [clientEditing, setClientEditing] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const textareaRef = useRef(null);

  const isClientView = userRole === 'client' || previewAsClient;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isSupabaseConfigured && !session && !demoMode) {
    return <AuthScreen onDemoLogin={() => setDemoMode(true)} />;
  }
  if (!isSupabaseConfigured && !demoMode) {
    return <AuthScreen onDemoLogin={() => setDemoMode(true)} />;
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const filteredBlocks = blocks
    .filter((b) => b.workspace_id === activeWorkspaceId)
    .filter((b) => activeCategory === 'all' || b.category === activeCategory)
    .sort((a, b) => a.sort_order - b.sort_order);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || filteredBlocks[0];

  const updateBlock = (id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleAddBlock = () => {
    const newId = `blk-${Date.now()}`;
    const newBlock = {
      id: newId,
      workspace_id: activeWorkspaceId,
      category: activeCategory === 'all' ? 'knowledge' : activeCategory,
      title: 'Novo Bloco de Conhecimento',
      sort_order: filteredBlocks.length + 1,
      is_active: true,
      is_locked_for_client: false,
      client_can_edit: true,
      client_can_delete: true,
      content_md: `# Título do Bloco\nEscreva aqui as informações que a IA deve saber...`,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newId);
  };

  const handleDeleteBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleRequestRemoval = (id) => {
    updateBlock(id, { removal_requested: true, is_active: false });
    setClientEditing(false);
  };

  const handleRestoreBlock = (id) => {
    updateBlock(id, { removal_requested: false, is_active: true });
  };

  const handleAddWorkspace = () => {
    const name = window.prompt('Nome do novo Agente / Cliente:');
    if (!name || !name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newWs = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      slug: slug || `agente-${Date.now()}`,
      embed_token: `tok-${Math.random().toString(36).slice(2, 10)}`,
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
    setSelectedBlockId(null);
  };

  const handleMoveBlock = (id, direction) => {
    const sorted = [...filteredBlocks];
    const idx = sorted.findIndex((b) => b.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
    const current = sorted[idx];
    const target = sorted[targetIdx];
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === current.id) return { ...b, sort_order: target.sort_order };
        if (b.id === target.id) return { ...b, sort_order: current.sort_order };
        return b;
      })
    );
  };

  // Envolve o texto selecionado no textarea com [[OCULTO]]...[[/OCULTO]]
  const handleBlurSelection = () => {
    const el = textareaRef.current;
    if (!el || !selectedBlock) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const text = selectedBlock.content_md;
    const selected = text.slice(start, end);
    const updated = text.slice(0, start) + `[[OCULTO]]\n${selected}\n[[/OCULTO]]` + text.slice(end);
    updateBlock(selectedBlock.id, { content_md: updated });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content =
        typeof reader.result === 'string' && (file.name.endsWith('.txt') || file.name.endsWith('.md'))
          ? reader.result
          : `# Conteúdo extraído de: ${file.name}\n\n*(Arquivo anexado — pronto para processamento via Webhook n8n / AnythingLLM)*`;
      const newId = `blk-file-${Date.now()}`;
      setBlocks((prev) => [
        ...prev,
        {
          id: newId,
          workspace_id: activeWorkspaceId,
          category: 'files',
          title: `Arquivo: ${file.name}`,
          sort_order: filteredBlocks.length + 1,
          is_active: true,
          is_locked_for_client: false,
          client_can_edit: true,
          client_can_delete: true,
          content_md: content,
        },
      ]);
      setSelectedBlockId(newId);
    };
    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      reader.onload();
    }
  };

  const assembledPrompt = blocks
    .filter((b) => b.workspace_id === activeWorkspaceId && b.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => `### ${b.title}\n${b.content_md.replace(/\[\[OCULTO\]\]|\[\[\/OCULTO\]\]/g, '').trim()}`)
    .join('\n\n---\n\n');

  const copyText = (text, setFlag) => {
    navigator.clipboard.writeText(text);
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  };

  return (
    <div className="h-screen flex bg-[#0d0d0f] text-zinc-100 overflow-hidden">
      {/* Sidebar Esquerda (Estilo Twenty CRM) */}
      <aside className="w-60 border-r border-zinc-800/70 bg-[#141416] flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800/70">
          <div className="flex items-center justify-between gap-2 px-1.5 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white truncate">Cognição-IA</span>
            </div>
            {!isClientView && (
              <button
                onClick={handleAddWorkspace}
                title="Novo Agente / Cliente"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 relative">
            <select
              value={activeWorkspaceId}
              onChange={(e) => {
                setActiveWorkspaceId(e.target.value);
                setSelectedBlockId(null);
              }}
              className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1.5 pr-7 text-xs font-medium text-zinc-200 focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>

        <div className="p-3 space-y-5 flex-1 overflow-y-auto">
          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Base de Conhecimento
            </div>
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <span>Todos os Blocos</span>
              <span className="text-[11px] text-zinc-500">{blocks.length}</span>
            </button>
          </div>

          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Módulos do Agente
            </div>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Anexar Arquivo (RAG / MD)
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-sky-500/60 bg-zinc-900/50 text-xs text-zinc-400 hover:text-sky-400 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Subir PDF / TXT / MD</span>
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <button
            onClick={() => setPreviewAsClient(!previewAsClient)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isClientView
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isClientView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isClientView ? 'Visão do Cliente (Ativa)' : 'Simular Visão do Cliente'}
          </button>

          <button
            onClick={() => {
              if (isSupabaseConfigured) supabase.auth.signOut();
              setDemoMode(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </aside>

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
            return (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
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
                    {!isClientView && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, 'up'); }}
                          title="Subir ordem"
                          className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, 'down'); }}
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
                {block.removal_requested && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> Remoção solicitada (Oculto p/ IA)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Área Principal: Editor Colorido + Preview */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              {selectedBlock ? selectedBlock.title : 'Selecione um bloco'}
            </span>
          </div>

          {!isClientView && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyText(
                    `${window.location.origin}/?embed=${activeWorkspace.embed_token}`,
                    setCopiedEmbed
                  )
                }
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 cursor-pointer"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                {copiedEmbed ? 'Link Copiado!' : 'Link de Integração'}
              </button>

              <button
                onClick={() => setShowPromptModal(true)}
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
            {(!isClientView || selectedBlock.client_can_edit) && (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <input
                  type="text"
                  value={selectedBlock.title}
                  onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
                  className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                />

                {!isClientView && (
                  <>
                    <button
                      onClick={handleBlurSelection}
                      title="Selecione um trecho no texto abaixo e clique aqui para borrar para o cliente"
                      className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" /> Borrar Seleção
                    </button>

                    <button
                      onClick={() =>
                        updateBlock(selectedBlock.id, {
                          is_locked_for_client: !selectedBlock.is_locked_for_client,
                        })
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
                      {selectedBlock.is_locked_for_client ? 'Bloco Oculto p/ Cliente' : 'Visível p/ Cliente'}
                    </button>
                  </>
                )}

                {!isClientView ? (
                  <div className="flex items-center gap-1.5">
                    {selectedBlock.removal_requested && (
                      <button
                        onClick={() => handleRestoreBlock(selectedBlock.id)}
                        title="Restaurar bloco para a IA"
                        className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBlock(selectedBlock.id)}
                      title="Apagar definitivamente"
                      className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  !selectedBlock.removal_requested && (
                    <button
                      onClick={() => handleRequestRemoval(selectedBlock.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Solicitar remoção
                    </button>
                  )
                )}
              </div>
            )}

            {/* Editor Único Colorido ao Vivo (Admin) ou Visão Protegida do Cliente */}
            {!isClientView || (clientEditing && selectedBlock.client_can_edit && !selectedBlock.is_locked_for_client) ? (
              <div className="flex flex-col">
                <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    {isClientView ? 'Editando Informações Públicas' : 'Editor Colorido ao Vivo (Markdown)'}
                  </span>
                  {isClientView ? (
                    <button
                      onClick={() => setClientEditing(false)}
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
                      ? selectedBlock.content_md.replace(/\[\[OCULTO\]\][\s\S]*?\[\[\/OCULTO\]\]/g, '').trim()
                      : selectedBlock.content_md
                  }
                  onChange={(val) => {
                    if (!isClientView) {
                      updateBlock(selectedBlock.id, { content_md: val });
                    } else {
                      const secrets = selectedBlock.content_md.match(/\[\[OCULTO\]\][\s\S]*?\[\[\/OCULTO\]\]/g) || [];
                      const merged = secrets.length ? `${val}\n\n${secrets.join('\n\n')}` : val;
                      updateBlock(selectedBlock.id, { content_md: merged });
                    }
                  }}
                />
              </div>
            ) : (
              <div>
                <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Visualização (Modo Cliente)
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

      {/* Modal: Prompt Montado para n8n */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#141417] p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Prompt Unificado (Como o n8n / Supabase lê)</h3>
                <p className="text-xs text-zinc-400">
                  Os trechos borrados para o cliente são enviados normalmente aqui para a IA.
                </p>
              </div>
              <button
                onClick={() => copyText(assembledPrompt, setCopiedPrompt)}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}
              </button>
            </div>
            <pre className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
              {assembledPrompt}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPromptModal(false)}
                className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
