import React, { useState } from 'react';
import {
  Copy, Check, Users, UserX, Terminal, AlertTriangle, Sparkles,
  UserPlus, KeyRound, Eye, EyeOff
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl space-y-5"
      >
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Novo Agente de Atendimento
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cria uma nova base de atendimento separada para uma empresa ou filial.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome do Agente ou Empresa</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Clínica CEMAG — Pilates"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            E-mail do Cliente com Acesso (opcional)
          </label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="cliente@empresa.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
          />
          {clientProfiles.length > 0 && (
            <div className="mt-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Clientes já cadastrados:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {clientProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOwnerEmail(p.email)}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition cursor-pointer ${
                      ownerEmail.toLowerCase() === p.email.toLowerCase()
                        ? 'border-sky-500 bg-sky-50 text-sky-700 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.full_name ? `${p.full_name} (${p.email})` : p.email}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none pt-1 font-medium">
          <input
            type="checkbox"
            checked={includeStarter}
            onChange={(e) => setIncludeStarter(e.target.checked)}
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Iniciar com tópicos modelo (Identidade, Serviços, Horários)
        </label>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? 'Criando...' : 'Criar Agente'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AccessModal({ workspace, registeredProfiles = [], onClose, onSave, onCreateClient }) {
  const [email, setEmail] = useState(workspace?.owner_email || '');
  const [saving, setSaving] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');

  const clientProfiles = registeredProfiles.filter((p) => p.role !== 'admin');
  const matched = clientProfiles.find(
    (p) => p.email?.toLowerCase() === email.trim().toLowerCase()
  );

  const handleSave = async (targetEmail) => {
    setSaving(true);
    await onSave(workspace.id, targetEmail);
    setSaving(false);
  };

  const handleCreateAndAssign = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newEmail.trim() || newPassword.length < 6) {
      setCreateError('Informe um e-mail válido e senha com pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    const res = await onCreateClient({
      fullName: newName.trim(),
      email: newEmail.trim(),
      password: newPassword,
      assignWorkspaceId: workspace.id,
    });
    setSaving(false);
    if (res?.error) {
      setCreateError(res.error);
      return;
    }
    setEmail(newEmail.trim().toLowerCase());
    setCreatingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Acesso do Cliente — {workspace?.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Defina qual cliente pode gerenciar as informações deste agente.
            </p>
          </div>
          {onCreateClient && (
            <button
              type="button"
              onClick={() => {
                setCreatingNew(!creatingNew);
                setCreateError('');
                if (!creatingNew && email.trim() && !matched) {
                  setNewEmail(email.trim());
                }
              }}
              className="flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 shrink-0 cursor-pointer transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {creatingNew ? 'Voltar' : 'Novo Cliente'}
            </button>
          )}
        </div>

        {creatingNew ? (
          <form onSubmit={handleCreateAndAssign} className="space-y-4 pt-1">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800 font-medium">
              Crie a conta do cliente agora. Ele já terá acesso automático a este agente.
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente / Empresa</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Dra. Ana — Clínica CEMAG"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Login</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Inicial (mín. 6 dígitos)</label>
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ex: Cliente@2026"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
            {createError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-medium">
                {createError}
              </p>
            )}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 transition shadow-sm"
              >
                {saving ? 'Criando...' : 'Criar e Vincular'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail do Usuário (Cliente)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
              {email.trim() && (
                <div className="mt-2 text-xs font-medium">
                  {matched ? (
                    <span className="text-emerald-700">
                      ✓ Cliente cadastrado: {matched.full_name || matched.email}
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      Não cadastrado ainda — use o botão <strong>+ Novo Cliente</strong> acima para criar agora.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                Clientes já cadastrados ({clientProfiles.length}):
              </div>
              {clientProfiles.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-2">
                  {clientProfiles.map((p) => {
                    const isSelected = email.trim().toLowerCase() === p.email.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEmail(p.email)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 border border-sky-200 text-sky-800 font-semibold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{p.full_name || 'Sem nome'}</div>
                          <div className="text-[10px] text-slate-400 truncate">{p.email}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 text-center">
                  Nenhum cliente cadastrado ainda. Clique em <strong>+ Novo Cliente</strong> acima para cadastrar.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {workspace?.owner_email ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave('')}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-semibold text-rose-700 cursor-pointer transition disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" /> Desvincular
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(email.trim())}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 transition shadow-sm"
                >
                  {saving ? 'Salvando...' : 'Salvar Acesso'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function NewClientModal({ workspaces = [], registeredProfiles = [], onClose, onCreateClient }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(true);
  const [assignWorkspaceId, setAssignWorkspaceId] = useState(workspaces[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const clientProfiles = registeredProfiles.filter((p) => p.role !== 'admin');

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Cog@';
    for (let i = 0; i < 6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pass);
    setShowPass(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || password.length < 6) {
      setError('Preencha um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    const res = await onCreateClient({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      assignWorkspaceId: assignWorkspaceId || null,
    });
    setSubmitting(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    setCreatedInfo({
      email: email.trim().toLowerCase(),
      password,
      needsEmailConfirm: Boolean(res?.needsEmailConfirm),
    });
  };

  const copyCredentials = () => {
    if (!createdInfo) return;
    const text = `Acesso à Central de IA\nLink: ${window.location.origin}${window.location.pathname}\nE-mail: ${createdInfo.email}\nSenha: ${createdInfo.password}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-600" />
            Cadastrar Novo Cliente
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Crie o login do cliente diretamente pelo painel para ele editar seus próprios tópicos.
          </p>
        </div>

        {createdInfo ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-2.5">
              <div className="text-xs font-bold text-emerald-800">
                ✓ Cliente cadastrado com sucesso!
              </div>
              <div className="text-xs text-slate-700 font-mono space-y-1 bg-white p-3 rounded-xl border border-emerald-100">
                <div><strong>E-mail:</strong> {createdInfo.email}</div>
                <div><strong>Senha:</strong> {createdInfo.password}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm transition"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCreds ? 'Dados Copiados!' : 'Copiar Dados de Acesso'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente / Empresa</label>
              <input
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Dra. Ana — Clínica CEMAG"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail de Login</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Senha Inicial</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" /> Gerar senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 pr-10 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {workspaces.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vincular ao Agente
                </label>
                <select
                  value={assignWorkspaceId}
                  onChange={(e) => setAssignWorkspaceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs cursor-pointer"
                >
                  <option value="">Não vincular agora</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} {ws.owner_email ? `(atual: ${ws.owner_email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-medium">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50 transition shadow-sm"
              >
                {submitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function PromptModal({ workspace, assembledPrompt, onClose }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copy = (text, setFlag) => {
    navigator.clipboard.writeText(text);
    setFlag(true);
    setTimeout(() => setFlag(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Prompt Consolidado — {workspace?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualização consolidada de todos os tópicos ativos enviados para a inteligência artificial.
            </p>
          </div>
          <button
            onClick={() => copy(assembledPrompt, setCopiedPrompt)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer shrink-0 shadow-sm transition"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? 'Copiado!' : 'Copiar Prompt'}
          </button>
        </div>

        <pre className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
          {assembledPrompt || '(Nenhum tópico ativo configurado ainda.)'}
        </pre>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
