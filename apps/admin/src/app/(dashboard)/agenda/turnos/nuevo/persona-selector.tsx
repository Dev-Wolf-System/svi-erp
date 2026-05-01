"use client";

import { useState, useTransition, useRef } from "react";
import { Search, X, Loader2, CheckCircle2 } from "lucide-react";
import type { PersonaTipo } from "@/modules/agenda";
import { buscarPersonas, type PersonaOption } from "./search-actions";

interface Props {
  tipo: PersonaTipo;
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
}

const TIPO_LABEL: Record<string, string> = {
  cliente: "cliente",
  inversor: "inversor",
  lead: "lead",
};

export function PersonaSelector({ tipo, value, label, onChange }: Props) {
  const [query, setQuery] = useState(label);
  const [options, setOptions] = useState<PersonaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    setQuery(q);
    if (value) onChange("", "");
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const results = await buscarPersonas(tipo, q);
        setOptions(results);
        setOpen(results.length > 0);
      });
    }, 300);
  }

  function select(opt: PersonaOption) {
    onChange(opt.id, opt.label);
    setQuery(opt.label);
    setOpen(false);
    setOptions([]);
  }

  function clear() {
    onChange("", "");
    setQuery("");
    setOptions([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-svi-muted-2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => options.length > 0 && setOpen(true)}
          placeholder={`Buscar ${TIPO_LABEL[tipo] ?? tipo} por nombre…`}
          autoComplete="off"
          className="w-full pl-8 pr-8 py-2 rounded-lg bg-svi-elevated border border-svi-border-muted text-svi-white focus:border-svi-gold focus:outline-none placeholder:text-svi-muted-2 text-sm"
        />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-svi-muted-2 pointer-events-none" />
        )}
        {!pending && (query || value) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-svi-muted-2 hover:text-svi-white"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && options.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full rounded-lg border border-svi-border-muted bg-svi-card shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(opt)}
                className="w-full text-left px-3 py-2 hover:bg-svi-elevated transition text-sm"
              >
                <div className="text-svi-white">{opt.label}</div>
                {opt.sublabel && (
                  <div className="text-xs text-svi-muted-2">{opt.sublabel}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && (
        <p className="text-xs text-svi-gold mt-1 flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          {label || "Seleccionado"}
        </p>
      )}
    </div>
  );
}
