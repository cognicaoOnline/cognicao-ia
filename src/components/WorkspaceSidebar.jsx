import React, { useState } from 'react';
import {
  Brain, Plus, Eye, EyeOff, LogOut, Upload, ChevronDown,
  LayoutGrid, Search, AlertTriangle, Check, UserPlus
} from 'lucide-react';
import { CATEGORIES } from '../lib/defaultTemplates';

export function WorkspaceSidebar({
  workspaces,
  activeWorkspace,
  activeWorkspaceId,
  onSelectWorkspace,
  onOpenNewWorkspace,
  onOpenNewClient,
  activeCategory,
  onSelectCategory,
  workspaceBlocks,
  allBlocks,
  viewMode,
  onChangeViewMode,
  onFileUpload,
  userRole,
  userEmail,
  isClientView,
  previewAsClient,
  onTogglePreviewAsClient,
  onSignOut,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchWs, setSearchWs] = useState('');

  const filteredWorkspaces = workspaces.filter((ws) =>
    `${ws.name} ${ws.owner_email || ''}`.toLowerCase().includes(searchWs.toLowerCase())
  );

  const pendingRemovalsTotal = allBlocks.filter((b) => b.removal_requested || (!b.is_active && b.client_can_edit)).length;

  return (
    <aside className="w-64 border-r border-zinc-800/70 bg-[#141416] flex flex-col shrink-0">
      {/* Topo estilo Twenty CRM */}
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
              onClick={onOpenNewWorkspace}
              title="Criar novo Agente / Cliente"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-[11px] font-medium text-zinc-200 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Novo
            </button>
          )}
        </div>

        {/* Seletor de Agente estilo Twenty CRM */}
        <div className="mt-2.5 relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:border-zinc-700 px-2.5 py-2 text-left transition cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-100 truncate">
                {activeWorkspace?.name || 'Selecione um agente'}
              </div>
              {!isClientView && activeWorkspace?.owner_email && (
                <div className="text-[10px] text-zinc-500 truncate">
                  {activeWorkspace.owner_email}
                </div>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 z-40 rounded-xl border border-zinc-800 bg-[#18181b] shadow-2xl p-1.5">
              {workspaces.length > 3 && (
                <div className="relative mb-1.5">
                  <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchWs}
                    onChange={(e) => setSearchWs(e.target.value)}
                    placeholder="Buscar agente ou cliente..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-7 pr-2 py-1 text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {filteredWorkspaces.map((ws) => {
                  const isSelected = ws.id === activeWorkspaceId && viewMode === 'editor';
                  const hasRemoval = allBlocks.some((b) => b.workspace_id === ws.id && b.removal_requested);
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        onSelectWorkspace(ws.id);
                        onChangeViewMode('editor');
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{ws.name}</div>
                        {!isClientView && ws.owner_email && (
                          <div className="text-[10px] text-zinc-500 truncate">{ws.owner_email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasRemoval && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                        {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                      </div>
                    </button>
                  );
                })}
                {filteredWorkspaces.length === 0 && (
                  <div className="px-2.5 py-2 text-[11px] text-zinc-500 text-center">
                    Nenhum agente encontrado.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão Visão Geral de Todos os Agentes e Cadastro de Cliente (Admin) */}
        {!isClientView && (
          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                onChangeViewMode(viewMode === 'overview' ? 'editor' : 'overview');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                Todos os Agentes ({workspaces.length})
              </span>
              {pendingRemovalsTotal > 0 && (
                <span className="rounded-full bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[10px] font-semibold">
                  {pendingRemovalsTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenNewClient();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-400" />
              Cadastrar Cliente
            </button>
          </div>
        )}
      </div>

      {/* Navegação dos Blocos */}
      <div className="p-3 space-y-5 flex-1 overflow-y-auto">
        <div>
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Base de Conhecimento
          </div>
          <button
            onClick={() => {
              onSelectCategory('all');
              onChangeViewMode('editor');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === 'editor' && activeCategory === 'all'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span>Todos os Blocos</span>
            <span className="text-[11px] text-zinc-500">{workspaceBlocks.length}</span>
          </button>
        </div>

        <div>
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Módulos do Agente
          </div>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const count = workspaceBlocks.filter((b) => b.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onChangeViewMode('editor');
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    viewMode === 'editor' && activeCategory === cat.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeWorkspace && (
          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Anexar Arquivo (TXT / MD / PDF)
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-sky-500/60 bg-zinc-900/50 text-xs text-zinc-400 hover:text-sky-400 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Arquivo</span>
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                className="hidden"
                onChange={onFileUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        {userRole === 'admin' && (
          <button
            onClick={onTogglePreviewAsClient}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
              previewAsClient
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {previewAsClient ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {previewAsClient ? 'Sair da Visão do Cliente' : 'Simular Visão do Cliente'}
          </button>
        )}

        <div className="flex items-center justify-between px-1.5 pt-1">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-zinc-300 truncate">
              {userEmail || 'Modo Demonstração'}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">
              {userRole === 'admin' ? 'Administrador' : 'Cliente'}
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sair da conta"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
