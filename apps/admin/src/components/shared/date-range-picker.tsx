"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check } from "lucide-react";

interface Props {
  desde: string;  // YYYY-MM-DD (ART)
  hasta: string;  // YYYY-MM-DD (ART)
  onChange: (next: { desde: string; hasta: string }) => void;
}

type PresetKey =
  | "hoy"
  | "ayer"
  | "ultimos7"
  | "esteMes"
  | "mesAnterior"
  | "personalizado";

interface Preset {
  key:   PresetKey;
  label: string;
  range: () => { desde: string; hasta: string };
}

// ─── Helpers de fecha en ART (UTC-3, sin DST) ───────────────────────────────

function todayArt(): string {
  // YYYY-MM-DD en zona ART
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function shiftDays(fechaArt: string, dias: number): string {
  const d = new Date(`${fechaArt}T00:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + dias);
  // Re-formatear en ART
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

function firstDayOfMonth(fechaArt: string): string {
  return `${fechaArt.slice(0, 7)}-01`;
}

function lastDayOfPrevMonth(fechaArt: string): string {
  const [y, m] = fechaArt.split("-").map(Number);
  const year = y!;
  const month = m!; // 1-12
  // Día 0 del mes actual = último día del mes anterior
  const d = new Date(Date.UTC(year, month - 1, 0));
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

function firstDayOfPrevMonth(fechaArt: string): string {
  const ult = lastDayOfPrevMonth(fechaArt);
  return `${ult.slice(0, 7)}-01`;
}

const PRESETS: Preset[] = [
  {
    key:   "hoy",
    label: "Hoy",
    range: () => {
      const t = todayArt();
      return { desde: t, hasta: t };
    },
  },
  {
    key:   "ayer",
    label: "Ayer",
    range: () => {
      const a = shiftDays(todayArt(), -1);
      return { desde: a, hasta: a };
    },
  },
  {
    key:   "ultimos7",
    label: "Últimos 7 días",
    range: () => {
      const hoy = todayArt();
      return { desde: shiftDays(hoy, -6), hasta: hoy };
    },
  },
  {
    key:   "esteMes",
    label: "Este mes",
    range: () => {
      const hoy = todayArt();
      return { desde: firstDayOfMonth(hoy), hasta: hoy };
    },
  },
  {
    key:   "mesAnterior",
    label: "Mes anterior",
    range: () => {
      const hoy = todayArt();
      return { desde: firstDayOfPrevMonth(hoy), hasta: lastDayOfPrevMonth(hoy) };
    },
  },
];

function detectPreset(desde: string, hasta: string): PresetKey {
  for (const p of PRESETS) {
    const r = p.range();
    if (r.desde === desde && r.hasta === hasta) return p.key;
  }
  return "personalizado";
}

function formatShort(fechaArt: string): string {
  // DD/MM
  const [, m, d] = fechaArt.split("-");
  return `${d}/${m}`;
}

function labelTrigger(desde: string, hasta: string, preset: PresetKey): string {
  const presetEntry = PRESETS.find((p) => p.key === preset);
  if (presetEntry) return presetEntry.label;
  if (desde === hasta) return formatShort(desde);
  return `${formatShort(desde)} – ${formatShort(hasta)}`;
}

export function DateRangePicker({ desde, hasta, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customDesde, setCustomDesde] = useState(desde);
  const [customHasta, setCustomHasta] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);

  const currentPreset = detectPreset(desde, hasta);
  const showCustom = currentPreset === "personalizado";

  // Sincronizar inputs con props si cambian externamente
  useEffect(() => {
    setCustomDesde(desde);
    setCustomHasta(hasta);
  }, [desde, hasta]);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function applyPreset(p: Preset) {
    const r = p.range();
    onChange(r);
    setOpen(false);
  }

  function applyCustom() {
    if (!customDesde || !customHasta) return;
    if (customDesde > customHasta) {
      // Si invirtieron, los reordena
      onChange({ desde: customHasta, hasta: customDesde });
    } else {
      onChange({ desde: customDesde, hasta: customHasta });
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-svi-border-muted bg-svi-dark text-sm text-svi-white hover:border-svi-gold focus:border-svi-gold focus:outline-none transition"
      >
        <Calendar className="size-4 text-svi-muted" />
        <span className="whitespace-nowrap">
          {labelTrigger(desde, hasta, currentPreset)}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[280px] rounded-xl border border-svi-border-muted bg-svi-card shadow-lg p-2">
          <ul className="flex flex-col">
            {PRESETS.map((p) => {
              const active = currentPreset === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition ${
                      active
                        ? "bg-svi-gold/10 text-svi-gold"
                        : "text-svi-white hover:bg-svi-elevated"
                    }`}
                  >
                    <span>{p.label}</span>
                    {active && <Check className="size-3.5" />}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  // Solo abre el editor; no aplica todavía
                  setCustomDesde(desde);
                  setCustomHasta(hasta);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition ${
                  showCustom
                    ? "bg-svi-gold/10 text-svi-gold"
                    : "text-svi-white hover:bg-svi-elevated"
                }`}
              >
                <span>Personalizado</span>
                {showCustom && <Check className="size-3.5" />}
              </button>
            </li>
          </ul>

          <div className="mt-2 border-t border-svi-border-muted pt-2 px-1 space-y-2">
            <div className="flex gap-2">
              <label className="flex-1 text-[11px] text-svi-muted uppercase tracking-wider">
                Desde
                <input
                  type="date"
                  value={customDesde}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-svi-border-muted bg-svi-dark px-2 text-xs text-svi-white focus:border-svi-gold focus:outline-none"
                />
              </label>
              <label className="flex-1 text-[11px] text-svi-muted uppercase tracking-wider">
                Hasta
                <input
                  type="date"
                  value={customHasta}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-svi-border-muted bg-svi-dark px-2 text-xs text-svi-white focus:border-svi-gold focus:outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customDesde || !customHasta}
              className="w-full h-9 rounded-md bg-svi-gold text-svi-black text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Aplicar rango personalizado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
