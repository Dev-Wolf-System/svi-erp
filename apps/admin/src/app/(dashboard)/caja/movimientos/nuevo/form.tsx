"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registrarMovimiento } from "@/modules/caja/actions";
import {
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
  MONEDAS,
  type MovimientoCreateInput,
} from "@/modules/caja/schemas";
import { AiSuggestInput } from "@/components/ai/ai-suggest-input";

export function NuevoMovimientoForm({
  sucursalId,
  sucursalNombre,
}: {
  sucursalId: string;
  sucursalNombre: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("ingreso");
  const [concepto, setConcepto] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  const categorias = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  // Si cambia el tipo (ingreso/egreso), reset categoría — el set de candidates cambia
  useEffect(() => {
    setCategoriaSeleccionada("");
  }, [tipo]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const input: MovimientoCreateInput = {
      sucursal_id:     sucursalId,
      tipo,
      categoria:       fd.get("categoria") as string,
      concepto:        fd.get("concepto") as string,
      monto:           Number(fd.get("monto")),
      moneda:          (fd.get("moneda") as "ARS" | "USD") ?? "ARS",
      comprobante_url: (fd.get("comprobante_url") as string) || null,
    };

    startTransition(async () => {
      const res = await registrarMovimiento(input);
      if (res.ok) {
        toast.success("Movimiento registrado");
        router.push("/caja");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sucursal (read-only context) */}
      <div className="text-sm text-svi-muted">
        Sucursal: <span className="text-svi-white font-medium">{sucursalNombre}</span>
      </div>

      {/* Tipo toggle */}
      <div>
        <label className="block text-sm font-medium text-svi-muted mb-2">Tipo</label>
        <div className="flex gap-2">
          {(["ingreso", "egreso"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                tipo === t
                  ? t === "ingreso"
                    ? "bg-svi-success/15 border-svi-success/40 text-svi-success"
                    : "bg-svi-error/15 border-svi-error/40 text-svi-error"
                  : "bg-svi-elevated border-svi-border-muted text-svi-muted hover:text-svi-white"
              }`}
            >
              {t === "ingreso" ? "↑ Ingreso" : "↓ Egreso"}
            </button>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="categoria" className="block text-sm font-medium text-svi-muted mb-1.5">
          Categoría
        </label>
        <select
          id="categoria"
          name="categoria"
          required
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          className="w-full rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2.5 text-sm text-svi-white focus:outline-none focus:ring-1 focus:ring-svi-gold/50"
        >
          <option value="">Seleccioná una categoría</option>
          {categorias.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Concepto */}
      <div>
        <label htmlFor="concepto" className="block text-sm font-medium text-svi-muted mb-1.5">
          Concepto / Descripción
        </label>
        <input
          id="concepto"
          name="concepto"
          type="text"
          required
          minLength={2}
          maxLength={200}
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: Cobro factura #1234"
          className="w-full rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2.5 text-sm text-svi-white placeholder:text-svi-muted-2 focus:outline-none focus:ring-1 focus:ring-svi-gold/50"
        />
        <AiSuggestInput
          text={concepto}
          moduleKey="caja"
          candidateCategories={[...categorias]}
          onSuggest={(s) => {
            if (s) setCategoriaSeleccionada(s.value);
          }}
        />
      </div>

      {/* Monto + moneda */}
      <div>
        <label htmlFor="monto" className="block text-sm font-medium text-svi-muted mb-1.5">
          Monto
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-svi-muted pointer-events-none">$</span>
            <input
              id="monto"
              name="monto"
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg bg-svi-elevated border border-svi-border-muted pl-7 pr-3 py-2.5 text-sm text-svi-white placeholder:text-svi-muted-2 focus:outline-none focus:ring-1 focus:ring-svi-gold/50"
            />
          </div>
          <select
            name="moneda"
            defaultValue="ARS"
            className="rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2.5 text-sm text-svi-white focus:outline-none focus:ring-1 focus:ring-svi-gold/50"
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comprobante URL (opcional) */}
      <div>
        <label htmlFor="comprobante_url" className="block text-sm font-medium text-svi-muted mb-1.5">
          URL comprobante <span className="text-svi-muted-2 font-normal">(opcional)</span>
        </label>
        <input
          id="comprobante_url"
          name="comprobante_url"
          type="url"
          placeholder="https://..."
          className="w-full rounded-lg bg-svi-elevated border border-svi-border-muted px-3 py-2.5 text-sm text-svi-white placeholder:text-svi-muted-2 focus:outline-none focus:ring-1 focus:ring-svi-gold/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/caja")}
          className="flex-1 py-2.5 rounded-lg border border-svi-border-muted text-sm text-svi-muted hover:text-svi-white transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
            tipo === "ingreso"
              ? "bg-svi-success text-white hover:bg-svi-success/90 disabled:opacity-50"
              : "bg-svi-error text-white hover:bg-svi-error/90 disabled:opacity-50"
          }`}
        >
          {pending ? "Guardando…" : `Registrar ${tipo}`}
        </button>
      </div>
    </form>
  );
}
