import React, { useState } from 'react';
import { Copy, Check, Users, UserX, Terminal, AlertTriangle, Sparkles } from 'lucide-react';

export function NewWorkspaceModal({ registeredProfiles = [], onClose, onCreate }) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [includeStarter, setIncludeStarter] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const clientProfiles = registeredProfiles.filter((p) => p.role !== 'admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onCreate({ name: name.trim(), ownerEmail: ownerEmail.trim(), includeStarter });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#141417] p-6 shadow-2xl space-y-4"
      >
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Novo Agente / Cliente
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Cria um novo painel separado sem afetar os agentes existentes.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do Agente ou Empresa</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Clínica CEMAG — Pilates"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            E-mail do Cliente (opcional)
          </label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="cliente@empresa.com"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
          {clientProfiles.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Clientes já cadastrados:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {clientProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOwnerEmail(p.email)}
                    className={`rounded-md border px-2 py-1 text-[11px] transition cursor-pointer ${
                      ownerEmail.toLowerCase() === p.email.toLowerCase()
                        ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {p.full_name ? `${p.full_name} (${p.email})` : p.email}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={includeStarter}
            onChange={(e) => setIncludeStarter(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900 accent-sky-500"
          />
          Iniciar com 4 blocos modelo (Identidade, Empresa, Serviços, Agendamento)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar Agente'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AccessModal({ workspace, registeredProfiles = [], onClose, onSave }) {
  const [email, setEmail] = useState(workspace?.owner_email || '');
  const [saving, setSaving] = useState(false);

  const clientProfiles = registeredProfiles.filter((p) => p.role !== 'admin');
  const matched = clientProfiles.find(
    (p) => p.email?.toLowerCase() === email.trim().toLowerCase()
  );

  const handleSave = async (targetEmail) => {
    setSaving(true);
    await onSave(workspace.id, targetEmail);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#141417] p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Acesso do Cliente — {workspace?.name}</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Defina qual usuário pode acessar e editar apenas este agente (sem ver blocos ocultos).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail do Usuário (Cliente)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
          {email.trim() && (
            <div className="mt-1.5 text-[11px]">
              {matched ? (
                <span className="text-emerald-400">
                  ✓ Usuário já cadastrado: {matched.full_name || matched.email}
                </span>
              ) : (
                <span className="text-amber-400">
                  Usuário ainda não cadastrado — o acesso será liberado assim que ele criar conta com este e-mail.
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Usuários cadastrados no sistema ({clientProfiles.length}):
          </div>
          {clientProfiles.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
              {clientProfiles.map((p) => {
                const isSelected = email.trim().toLowerCase() === p.email.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEmail(p.email)}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 border border-sky-500/30 text-sky-300'
                        : 'hover:bg-zinc-900 text-zinc-300 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.full_name || 'Sem nome'}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{p.email}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] text-zinc-500">
              Nenhum cliente cadastrado ainda. Peça para o cliente criar conta na tela inicial ou informe o e-mail dele acima para pré-vincular.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {workspace?.owner_email ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('')}
              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              <UserX className="w-3.5 h-3.5" /> Remover vínculo
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(email.trim())}
              className="rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Acesso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromptModal({ workspace, assembledPrompt, onClose }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://SEU-PROJETO.supabase.co';
  const n8nRestUrl = `${supabaseUrl}/rest/v1/v_cog_n8n_prompts?workspace_id=eq.${workspace?.id}&select=full_prompt_md,workspace_name`;

  const copy = (text, setFlag) => {
    navigator.clipboard.writeText(text);
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#141417] p-6 shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Prompt Unificado — {workspace?.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Trechos ocultos para o cliente aparecem aqui normalmente. Blocos com remoção solicitada ficam fora da IA.
            </p>
          </div>
          <button
            onClick={() => copy(assembledPrompt, setCopiedPrompt)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 px-3 py-1.5 text-xs font-semibold cursor-pointer shrink-0"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Endpoint Supabase / HTTP Request (n8n)
            </div>
            <div className="text-xs font-mono text-emerald-300 truncate mt-0.5">
              {n8nRestUrl}
            </div>
          </div>
          <button
            onClick={() => copy(n8nRestUrl, setCopiedQuery)}
            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 cursor-pointer shrink-0"
          >
            {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedQuery ? 'Copiado' : 'Copiar URL'}
          </button>
        </div>

        <pre className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
          {assembledPrompt || '(Nenhum bloco ativo neste agente ainda.)'}
        </pre>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, description, confirmLabel = 'Confirmar', onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#141417] p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-zinc-400 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500 hover:bg-red-400 text-white px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
