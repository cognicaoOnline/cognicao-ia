import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Renderiza Markdown no tema Softr Light Clean
 */
export function ColoredMarkdown({ content = '', isClientView = false, isBlockLocked = false }) {
  if (isClientView && isBlockLocked) {
    return (
      <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-8 overflow-hidden select-none">
        <div className="blur-md opacity-30 pointer-events-none space-y-2 text-sm text-slate-500">
          <p># Regras Estratégicas Protegidas</p>
          <p>Este bloco contém instruções internas configuradas pela equipe técnica.</p>
          <p>O conteúdo permanece ativo para a IA, mas protegido contra alterações.</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100/40 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-sm px-4 py-2 text-xs font-medium text-amber-700">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            Tópico Protegido (Ativo na IA)
          </div>
        </div>
      </div>
    );
  }

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
            className="my-1 inline-flex items-center gap-2 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 select-none"
          >
            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="blur-sm text-slate-400 text-sm">Regra interna oculta</span>
          </div>
        );
      }

      if (line.startsWith('# ')) {
        return (
          <h1 key={key} className="text-xl font-bold text-slate-900 mt-4 mb-2 tracking-tight">
            {line.replace(/^# /, '')}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={key} className="text-base font-semibold text-sky-700 mt-3 mb-1.5">
            {line.replace(/^## /, '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={key} className="text-sm font-semibold text-slate-700 mt-2 mb-1">
            {line.replace(/^### /, '')}
          </h3>
        );
      }

      const formatted = line
        .split(/(\*\*.*?\*\*|\{\{.*?\}\})/g)
        .map((chunk, cIdx) => {
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return (
              <strong key={cIdx} className="font-semibold text-slate-900">
                {chunk.slice(2, -2)}
              </strong>
            );
          }
          if (chunk.startsWith('{{') && chunk.endsWith('}}')) {
            return (
              <span
                key={cIdx}
                className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-xs font-mono text-purple-700"
              >
                {chunk}
              </span>
            );
          }
          return chunk;
        });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={key} className="flex items-start gap-2 pl-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-sky-500 font-bold mt-0.5">•</span>
            <span>{formatted}</span>
          </div>
        );
      }

      return (
        <p key={key} className="text-sm text-slate-700 leading-relaxed min-h-[1.25rem]">
          {formatted}
        </p>
      );
    });
  };

  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('[[OCULTO]]') && part.endsWith('[[/OCULTO]]')) {
          const inner = part.replace('[[OCULTO]]', '').replace('[[/OCULTO]]', '').trim();
          if (isClientView) {
            return (
              <div
                key={i}
                className="relative my-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 select-none overflow-hidden"
              >
                <div className="blur-sm opacity-30 pointer-events-none text-xs text-amber-900">
                  {inner}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-amber-200 shadow-sm px-3 py-1 text-[11px] font-medium text-amber-700">
                    <Lock className="w-3 h-3 text-amber-600" /> Trecho protegido (visível apenas para a IA)
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="my-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
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
