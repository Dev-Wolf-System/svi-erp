"use client";

import { Sparkles } from "lucide-react";

interface Props {
  content:   string;
  title?:    string;
  className?: string;
}

/**
 * Renderiza un bloque de texto generado por IA.
 * Soporta markdown ligero: negritas (**), saltos de línea, listas con guiones.
 * No usamos un parser MD completo para evitar dependencias y XSS.
 */
export function AiNarrativeBlock({ content, title, className }: Props) {
  const lines = content.split("\n");

  return (
    <div className={`rounded-2xl border border-svi-gold/20 bg-svi-gold/5 p-4 ${className ?? ""}`}>
      <header className="flex items-center gap-2 mb-2 text-svi-gold text-xs font-semibold uppercase tracking-wider">
        <Sparkles className="size-3.5" />
        {title ?? "Análisis IA"}
      </header>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed === "") return <div key={i} className="h-1" />;

          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <p key={i} className="text-sm text-svi-white leading-relaxed pl-4 relative">
                <span className="absolute left-0 top-2 size-1 rounded-full bg-svi-gold" />
                <FormatLine text={trimmed.slice(2)} />
              </p>
            );
          }
          return (
            <p key={i} className="text-sm text-svi-white leading-relaxed">
              <FormatLine text={trimmed} />
            </p>
          );
        })}
      </div>
    </div>
  );
}

function FormatLine({ text }: { text: string }) {
  // Renderiza **negrita** sin parser completo
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
