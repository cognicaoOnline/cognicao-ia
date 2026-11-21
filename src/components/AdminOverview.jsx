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
    <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0f] overflow-hidden">
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-[#121215]">
        <div>
          <h1 className="text-sm font-semibold text-white">Agentes & Clientes (Visão Geral)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 px-3 py-1.5 text-xs font-medium cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-sky-400" /> Novo Cliente
          </button>
          <button
            onClick={onOpenNewWorkspace}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Agente
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Total de Agentes</div>
            <div className="text-2xl font-bold text-white mt-1">{workspaces.length}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Clientes Vinculados</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{linkedClientsCount}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#141417] p-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Remoções Pendentes</div>
            <div className={`text-2xl font-bold mt-1 ${totalPendingRemovals > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {totalPendingRemovals}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome do agente ou e-mail do cliente..."
            className="w-full rounded-lg border border-zinc-800 bg-[#141417] pl-9 pr-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Tabela estilo Twenty CRM */}
        <div className="rounded-xl border border-zinc-800 bg-[#141417] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900/40">
                  <th className="py-3 px-4">Agente</th>
                  <th className="py-3 px-4">Cliente com Acesso</th>
                  <th className="py-3 px-4">Blocos Ativos</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filtered.map((ws) => {
                  const wsBlocks = blocks.filter((b) => b.workspace_id === ws.id);
                  const activeCount = wsBlocks.filter((b) => b.is_active).length;
                  const removals = wsBlocks.filter((b) => b.removal_requested).length;
                  const isEditing = editingId === ws.id;

                  return (
                    <tr key={ws.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white focus:border-sky-500 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (editingName.trim()) onRenameWorkspace(ws.id, editingName.trim());
                                setEditingId(null);
                              }}
                              className="p-1 text-emerald-400 hover:bg-zinc-800 rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-800 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-100">{ws.name}</span>
                            <button
                              onClick={() => {
                                setEditingId(ws.id);
                                setEditingName(ws.name);
                              }}
                              title="Renomear agente"
                              className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{ws.slug}</div>
                      </td>

                      <td className="py-3 px-4">
                        {ws.owner_email ? (
                          <span className="inline-flex items-center gap-1.5 text-zinc-300">
                            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                            {ws.owner_email}
                          </span>
                        ) : (
                          <span className="text-zinc-500 italic">Somente Admin</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-zinc-300">
                          <Layers className="w-3.5 h-3.5 text-zinc-500" />
                          {activeCount} / {wsBlocks.length}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {removals > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                            <AlertTriangle className="w-3 h-3" /> {removals} remoção solicitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenAccessModal(ws)}
                            title="Definir acesso do cliente"
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                          <button
                            onClick={() => onOpenPromptModal(ws)}
                            title="Ver prompt unificado / n8n"
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 cursor-pointer"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                          {workspaces.length > 1 && (
                            <button
                              onClick={() => onDeleteWorkspace(ws)}
                              title="Excluir agente"
                              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectWorkspace(ws.id)}
                            className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-white cursor-pointer"
                          >
                            Abrir <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      Nenhum agente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
