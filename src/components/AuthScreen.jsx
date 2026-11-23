import React, { useState } from 'react';
import { Brain, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function AuthScreen({ onDemoLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      onDemoLogin();
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), role: 'client' } },
        });
        if (error) throw error;
        setMessage('Cadastro realizado! Verifique seu e-mail ou faça login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setMessage('E-mail ou senha incorretos.');
      } else if (msg.includes('Email not confirmed')) {
        setMessage('Confirme seu e-mail antes de entrar.');
      } else if (msg.includes('User already registered')) {
        setMessage('Este e-mail já está cadastrado. Faça login.');
      } else {
        setMessage(msg || 'Erro ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cognição IA</h1>
            <p className="text-xs text-slate-500">Portal de Gestão de Atendentes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome ou empresa"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          {message && (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 text-sm transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Entrando...' : isSignUp ? 'Criar Conta' : 'Entrar no Painel'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 text-xs font-semibold transition cursor-pointer"
            >
              Entrar no Modo Demonstração
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          {isSignUp ? 'Já tem conta?' : 'Novo por aqui?'}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sky-600 font-semibold hover:underline cursor-pointer"
          >
            {isSignUp ? 'Fazer login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
