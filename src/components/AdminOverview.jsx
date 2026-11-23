import React, { useState } from 'react';
import {
  Search, Plus, Lock, Terminal, Trash2, ArrowRight,
  AlertTriangle, CheckCircle2, UserCheck, Layers, Pencil, Check, X, UserPlus
} from 'lucide-react';

export function AdminOverview({
  workspaces,
  blocks,
  onSelectWorkspace,
  onOpenNewWorkspace,
  onOpenNewClient,
  onOpenAccessModal,
  onOpenPromptModal,
  onRenameWorkspace,
  onDeleteWorkspace,
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const filtered = workspaces.filter((ws) =>
    `${ws.name} ${ws.owner_email || ''} ${ws.slug || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalPendingRemovals = blocks.filter((b) => b.removal_requested).length;
  const linkedClientsCount = workspaces.filter((w) => w.owner_email).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden select-none">
      <header className="h-16 border-b border-slate-200/80 px-8 flex items-center justify-between bg-white shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Atendentes &amp; Clientes</h1>
          <p className="text-xs text-slate-500 font-medium">Painel geral de inteligência artificial das empresas</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-2xs transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-sky-600" /> Novo Cliente
          </button>
          <button
            onClick={onOpenNewWorkspace}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Agente
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Cards de Resumo estilo Softr */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Agentes</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{workspaces.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clientes com Acesso</div>
            <div className="text-3xl font-extrabold text-sky-600 mt-2">{linkedClientsCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pausas / Remoções Pendentes</div>
            <div className={`text-3xl font-extrabold mt-2 ${totalPendingRemovals > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalPendingRemovals}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do agente ou e-mail..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-xs transition"
          />
        </div>

        {/* Tabela estilo Softr */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3.5 px-6">Agente</th>
                  <th className="py-3.5 px-6">Cliente com Acesso</th>
                  <th className="py-3.5 px-6">Tópicos Ativos</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((ws) => {
                  const wsBlocks = blocks.filter((b) => b.workspace_id === ws.id);
                  const activeCount = wsBlocks.filter((b) => b.is_active).length;
                  const removals = wsBlocks.filter((b) => b.removal_requested).length;
                  const isEditing = editingId === ws.id;

                  return (
                    <tr key={ws.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (editingName.trim()) onRenameWorkspace(ws.id, editingName.trim());
                                setEditingId(null);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{ws.name}</span>
                            <button
                              onClick={() => {
                                setEditingId(ws.id);
                                setEditingName(ws.name);
                              }}
                              title="Renomear"
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{ws.slug}</div>
                      </td>

                      <td className="py-4 px-6">
                        {ws.owner_email ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                            {ws.owner_email}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Somente Administrador</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {activeCount} de {wsBlocks.length}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {removals > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            <AlertTriangle className="w-3 h-3" /> {removals} pausa solicitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Em Operação
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenAccessModal(ws)}
                            title="Acesso do Cliente"
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer transition"
                          >
                            <Lock className="w-3.5 h-3.5 text-sky-600" />
                          </button>
                          <button
                            onClick={() => onOpenPromptModal(ws)}
                            title="Prompt Consolidado"
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer transition"
                          >
                            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          {workspaces.length > 1 && (
                            <button
                              onClick={() => onDeleteWorkspace(ws)}
                              title="Excluir"
                              className="p-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 shadow-2xs cursor-pointer transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectWorkspace(ws.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs cursor-pointer transition"
                          >
                            Abrir <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
