import React, { useRef } from 'react';

/**
 * Editor único com coloração ao vivo (Syntax Highlighting) estilo Supabase/IDE,
 * sem precisar de duas telas lado a lado.
 */
export function LivePromptEditor({ value = '', onChange, textareaRef }) {
  const preRef = useRef(null);

  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const highlightLine = (line, idx) => {
    const trimmed = line.trim();

    // Marcadores [[OCULTO]] e [[/OCULTO]]
    if (trimmed === '[[OCULTO]]' || trimmed === '[[/OCULTO]]') {
      return (
        <div key={idx} className="text-amber-400 font-bold bg-amber-500/10 rounded px-1 -mx-1">
          {line || ' '}
        </div>
      );
    }

    // Linhas de alerta (#⚠️, #🚨, #NÃO)
    if (/^#\s*(⚠️|🚨|NÃO|PARE|URGÊNCIA)/i.test(trimmed)) {
      return (
        <div key={idx} className="text-rose-400 font-semibold">
          {line}
        </div>
      );
    }

    // Títulos e diretivas com # (ex: #2., #2.1, #(Espere...))
    if (trimmed.startsWith('#')) {
      return (
        <div key={idx} className="text-sky-400 font-semibold">
          {line}
        </div>
      );
    }

    // Listas numeradas (1., 2.) ou com traço (-, *)
    if (/^(\d+\.|-|\*)\s/.test(trimmed)) {
      const match = line.match(/^(\s*(?:\d+\.|-|\*)\s)(.*)$/);
      if (match) {
        return (
          <div key={idx}>
            <span className="text-emerald-400 font-bold">{match[1]}</span>
            <span className="text-zinc-200">{highlightInline(match[2])}</span>
          </div>
        );
      }
    }

    return (
      <div key={idx} className="text-zinc-200">
        {line ? highlightInline(line) : '\u00A0'}
      </div>
    );
  };

  // Destaca "textos entre aspas" (laranja/verde) e {{variáveis}} (roxo)
  const highlightInline = (text) => {
    const parts = text.split(/("[^"]*"|\{\{[^}]*\}\}|\*\*[^*]*\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return <span key={i} className="text-amber-300">{part}</span>;
      }
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return <span key={i} className="text-purple-400 font-semibold">{part}</span>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="text-white font-bold">{part}</span>;
      }
      return part;
    });
  };

  const lines = value.split('\n');

  return (
    <div className="relative w-full h-[460px] rounded-xl border border-zinc-800 bg-[#141417] overflow-hidden font-mono text-sm leading-6">
      {/* Camada de fundo colorida */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 p-4 m-0 overflow-hidden whitespace-pre-wrap break-words pointer-events-none select-none"
      >
        {lines.map((line, idx) => highlightLine(line, idx))}
      </pre>

      {/* Textarea transparente por cima para digitação fluida */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        className="relative z-10 w-full h-full p-4 m-0 bg-transparent text-transparent caret-sky-400 resize-none focus:outline-none whitespace-pre-wrap break-words selection:bg-sky-500/30"
      />
    </div>
  );
}
