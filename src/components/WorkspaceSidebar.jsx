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
  isEmbedded = false,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchWs, setSearchWs] = useState('');

  const filteredWorkspaces = workspaces.filter((ws) =>
    `${ws.name} ${ws.owner_email || ''}`.toLowerCase().includes(searchWs.toLowerCase())
  );

  const pendingRemovalsTotal = allBlocks.filter((b) => b.removal_requested || (!b.is_active && b.client_can_edit)).length;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none">
      {/* Topo / Logo */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 tracking-tight block">Cognição IA</span>
              <span className="text-[10px] text-slate-400 font-medium block">Portal de Gestão</span>
            </div>
          </div>
          {!isClientView && (
            <button
              onClick={onOpenNewWorkspace}
              title="Criar novo Agente"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          )}
        </div>

        {/* Seletor de Agente */}
        <div className="mt-3.5 relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 px-3 py-2 text-left transition cursor-pointer shadow-sm"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {activeWorkspace?.name || 'Selecione um agente'}
              </div>
              {!isClientView && activeWorkspace?.owner_email && (
                <div className="text-[10px] text-slate-500 truncate">
                  {activeWorkspace.owner_email}
                </div>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white shadow-xl p-1.5">
              {workspaces.length > 3 && (
                <div className="relative mb-1.5">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchWs}
                    onChange={(e) => setSearchWs(e.target.value)}
                    placeholder="Buscar agente..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none"
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
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 text-sky-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate">{ws.name}</div>
                        {!isClientView && ws.owner_email && (
                          <div className="text-[10px] text-slate-400 truncate">{ws.owner_email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasRemoval && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Visão Geral (Admin) */}
        {!isClientView && (
          <div className="mt-2.5 space-y-1">
            <button
              type="button"
              onClick={() => {
                onChangeViewMode(viewMode === 'overview' ? 'editor' : 'overview');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                viewMode === 'overview'
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                Todos os Agentes ({workspaces.length})
              </span>
              {pendingRemovalsTotal > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-semibold">
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-600" />
              Cadastrar Cliente
            </button>
          </div>
        )}
      </div>

      {/* Navegação de Categorias / Módulos */}
      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        <div>
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Base de Conhecimento
          </div>
          <button
            onClick={() => {
              onSelectCategory('all');
              onChangeViewMode('editor');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              viewMode === 'editor' && activeCategory === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Todos os Tópicos</span>
            <span className={`text-[11px] font-semibold ${viewMode === 'editor' && activeCategory === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
              {workspaceBlocks.length}
            </span>
          </button>
        </div>

        <div>
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Módulos do Atendente
          </div>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const count = workspaceBlocks.filter((b) => b.category === cat.id).length;
              const isSelected = viewMode === 'editor' && activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onChangeViewMode('editor');
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeWorkspace && (
          <div>
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Anexar Arquivo
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 text-xs text-slate-600 hover:text-sky-700 cursor-pointer transition shadow-xs">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Subir TXT / MD / PDF</span>
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
      {!isEmbedded && (
        <div className="p-3 border-t border-slate-100 space-y-2">
          {userRole === 'admin' && (
            <button
              onClick={onTogglePreviewAsClient}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                previewAsClient
                  ? 'bg-amber-50 border-amber-200 text-amber-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {previewAsClient ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              {previewAsClient ? 'Sair da Visão do Cliente' : 'Simular Visão do Cliente'}
            </button>
          )}

          <div className="flex items-center justify-between px-2 pt-1">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {userEmail || 'Demonstração'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {userRole === 'admin' ? 'Administrador' : 'Cliente'}
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sair"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
