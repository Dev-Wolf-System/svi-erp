"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Turno } from "@/modules/agenda";

const HORA_INICIO = 7; // calendario muestra 07:00–22:00
const HORA_FIN = 22;
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export function CalendarioSemanal({
  lunes,
  turnos,
}: {
  lunes: string;
  turnos: Turno[];
}) {
  const lunesDate = useMemo(() => new Date(lunes), [lunes]);
  const dias = useMemo(() => {
    const out: { iso: string; label: string; numero: number; esHoy: boolean }[] = [];
    const hoyIso = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunesDate);
      d.setDate(lunesDate.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      out.push({
        iso,
        label: DIAS_SEMANA[i] ?? "",
        numero: d.getDate(),
        esHoy: iso === hoyIso,
      });
    }
    return out;
  }, [lunesDate]);

  // Agrupar turnos por día (YYYY-MM-DD)
  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of turnos) {
      const dia = new Date(t.inicio).toISOString().slice(0, 10);
      const arr = map.get(dia) ?? [];
      arr.push(t);
      map.set(dia, arr);
    }
    return map;
  }, [turnos]);

  const horasFila = useMemo(() => {
    const out: number[] = [];
    for (let h = HORA_INICIO; h < HORA_FIN; h++) out.push(h);
    return out;
  }, []);

  const ROW_HEIGHT_PX = 56; // alto de cada hora en la grilla
  const totalHeight = (HORA_FIN - HORA_INICIO) * ROW_HEIGHT_PX;

  return (
    <div className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      {/* Header con días */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-svi-border-muted">
        <div className="bg-svi-elevated" />
        {dias.map((d) => (
          <div
            key={d.iso}
            className={`px-3 py-3 text-center border-l border-svi-border-muted ${
              d.esHoy ? "bg-svi-gold/10" : "bg-svi-elevated"
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-svi-muted-2">
              {d.label}
            </p>
            <p
              className={`text-2xl font-display ${d.esHoy ? "text-svi-gold" : "text-svi-white"}`}
            >
              {d.numero}
            </p>
          </div>
        ))}
      </div>

      {/* Grilla de horas */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] relative">
        {/* Columna de horas */}
        <div className="border-r border-svi-border-muted">
          {horasFila.map((h) => (
            <div
              key={h}
              style={{ height: `${ROW_HEIGHT_PX}px` }}
              className="border-b border-svi-border-muted px-2 pt-1 text-[10px] font-mono text-svi-muted-2"
            >
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Columnas de días con turnos absolutos */}
        {dias.map((d) => (
          <div
            key={d.iso}
            className="border-l border-svi-border-muted relative"
            style={{ height: `${totalHeight}px` }}
          >
            {/* Líneas de hora (background) */}
            {horasFila.map((h) => (
              <div
                key={h}
                style={{ height: `${ROW_HEIGHT_PX}px` }}
                className="border-b border-svi-border-muted/40"
              />
            ))}

            {/* Turnos posicionados absolutamente */}
            {(turnosPorDia.get(d.iso) ?? []).map((t) => (
              <TurnoBlock key={t.id} turno={t} rowHeight={ROW_HEIGHT_PX} />
            ))}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-svi-muted-2 px-3 py-2 border-t border-svi-border-muted bg-svi-elevated/50">
        Mostrando {HORA_INICIO}:00–{HORA_FIN}:00. Click en un turno para ver detalle.
      </p>
    </div>
  );
}

function TurnoBlock({ turno, rowHeight }: { turno: Turno; rowHeight: number }) {
  const inicio = new Date(turno.inicio);
  const fin = new Date(turno.fin);

  const minutosDesde = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
  const duracionMin = (fin.getTime() - inicio.getTime()) / 60000;

  const top = (minutosDesde / 60) * rowHeight;
  const height = Math.max((duracionMin / 60) * rowHeight, 24);

  if (top < 0 || top >= (HORA_FIN - HORA_INICIO) * rowHeight) return null;

  const color = turno.recurso_color ?? "#C5A059";
  const dim = turno.estado === "cancelado" || turno.estado === "no_show";

  return (
    <Link
      href={`/agenda/turnos/${turno.id}`}
      className="absolute left-1 right-1 rounded-md px-2 py-1 text-[11px] overflow-hidden hover:z-10 hover:shadow-lg transition group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: dim ? "transparent" : `${color}1A`,
        borderLeft: `3px solid ${color}`,
        opacity: dim ? 0.55 : 1,
      }}
      title={`${turno.persona_label ?? ""} — ${turno.motivo} (${turno.estado})`}
    >
      <p className="font-mono text-[10px] text-svi-muted-2 leading-tight">
        {fmt(inicio)}–{fmt(fin)}
      </p>
      <p className="text-svi-white font-medium truncate leading-tight">
        {turno.persona_label ?? "—"}
      </p>
      <p className="text-svi-muted truncate leading-tight">{turno.motivo}</p>
      <EstadoTag estado={turno.estado} />
    </Link>
  );
}

function fmt(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function EstadoTag({ estado }: { estado: Turno["estado"] }) {
  const meta: Record<Turno["estado"], { label: string; cls: string }> = {
    solicitado: { label: "Solicitado", cls: "bg-svi-warning/20 text-svi-warning" },
    confirmado: { label: "Confirmado", cls: "bg-svi-success/20 text-svi-success" },
    cumplido: { label: "Cumplido", cls: "bg-svi-info/20 text-svi-info" },
    cancelado: { label: "Cancelado", cls: "bg-svi-error/20 text-svi-error" },
    no_show: { label: "No-show", cls: "bg-svi-error/20 text-svi-error" },
  };
  const m = meta[estado];
  return (
    <span
      className={`absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
