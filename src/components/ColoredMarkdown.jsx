import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Renderiza Markdown colorido com suporte a trechos secretos [[OCULTO]]...[[/OCULTO]]
 * e linhas iniciadas com ##! que ficam borradas na visão do cliente.
 */
export function ColoredMarkdown({ content = '', isClientView = false, isBlockLocked = false }) {
  if (isClientView && isBlockLocked) {
    return (
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 overflow-hidden select-none">
        <div className="blur-md opacity-40 pointer-events-none space-y-2 text-sm text-zinc-400">
          <p># Regras Estratégicas Protegidas</p>
          <p>Este bloco contém instruções internas de engenharia de prompt configuradas pela equipe técnica.</p>
          <p>O conteúdo permanece ativo para a IA, mas oculto para proteção.</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 rounded-full bg-zinc-900/90 border border-zinc-700 px-4 py-1.5 text-xs font-medium text-amber-400 shadow-lg">
            <Lock className="w-3.5 h-3.5" />
            Regra Interna Protegida (Ativa na IA)
          </div>
        </div>
      </div>
    );
  }

  // Divide o texto entre partes visíveis e partes [[OCULTO]]...[[/OCULTO]]
  const parts = content.split(/(\[\[OCULTO\]\][\s\S]*?\[\[\/OCULTO\]\])/g);

  const renderStyledLines = (text, keyPrefix) => {
    return text.split('\n').map((line, idx) => {
      const key = `${keyPrefix}-${idx}`;
      const isSecretLine = line.trim().startsWith('##!');

      if (isSecretLine && isClientView) {
        return (
          <div
            key={key}
            title="Trecho oculto pelo administrador"
            className="my-1 inline-flex items-center gap-2 rounded bg-zinc-800/80 px-2 py-0.5 select-none"
          >
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="blur-sm text-zinc-400 text-sm">Regra interna oculta</span>
          </div>
        );
      }

      if (line.startsWith('# ')) {
        return (
          <h1 key={key} className="text-lg font-bold text-sky-400 mt-3 mb-1.5">
            {line.replace(/^# /, '')}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={key} className="text-base font-semibold text-emerald-400 mt-2.5 mb-1">
            {line.replace(/^## /, '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={key} className="text-sm font-semibold text-amber-400 mt-2 mb-1">
            {line.replace(/^### /, '')}
          </h3>
        );
      }

      // Destaca **negrito** e {{variáveis}}
      const formatted = line
        .split(/(\*\*.*?\*\*|\{\{.*?\}\})/g)
        .map((chunk, cIdx) => {
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return (
              <strong key={cIdx} className="font-semibold text-white">
                {chunk.slice(2, -2)}
              </strong>
            );
          }
          if (chunk.startsWith('{{') && chunk.endsWith('}}')) {
            return (
              <span
                key={cIdx}
                className="rounded bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 text-xs font-mono text-purple-300"
              >
                {chunk}
              </span>
            );
          }
          return chunk;
        });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={key} className="flex items-start gap-2 pl-2 text-sm text-zinc-300 leading-relaxed">
            <span className="text-sky-400 mt-1">•</span>
            <span>{formatted}</span>
          </div>
        );
      }

      return (
        <p key={key} className="text-sm text-zinc-300 leading-relaxed min-h-[1.25rem]">
          {formatted}
        </p>
      );
    });
  };

  return (
    <div className="space-y-0.5">
      {parts.map((part, i) => {
        if (part.startsWith('[[OCULTO]]') && part.endsWith('[[/OCULTO]]')) {
          const inner = part.replace('[[OCULTO]]', '').replace('[[/OCULTO]]', '').trim();
          if (isClientView) {
            return (
              <div
                key={i}
                className="relative my-3 rounded-lg border border-amber-500/20 bg-zinc-900/80 p-3 select-none overflow-hidden"
              >
                <div className="blur-sm opacity-35 pointer-events-none text-xs text-zinc-400">
                  {inner}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/90 border border-zinc-700 px-3 py-1 text-[11px] font-medium text-amber-400">
                    <Lock className="w-3 h-3" /> Trecho secreto (visível só para a IA)
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="my-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
                <Lock className="w-3 h-3" /> Trecho Oculto para o Cliente (Ativo na IA)
              </div>
              {renderStyledLines(inner, `secret-${i}`)}
            </div>
          );
        }
        return <div key={i}>{renderStyledLines(part, `pub-${i}`)}</div>;
      })}
    </div>
  );
}
