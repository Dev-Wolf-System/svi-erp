"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, X, ExternalLink, Coins } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCurrency, formatDate } from "@repo/utils";
import { registrarAporte } from "@/modules/inversiones/actions";
import type { AporteRow } from "@/modules/inversiones/queries";
import type { EstadoInversion } from "@/modules/inversiones/schemas";

interface Props {
  inversionId: string;
  estado: EstadoInversion;
  moneda: "ARS" | "USD";
  capitalActual: number;
  capitalInicial: number;
  aportes: AporteRow[];
}

export function AportesPanel({
  inversionId,
  estado,
  moneda,
  capitalActual,
  capitalInicial,
  aportes,
}: Props) {
  const [open, setOpen] = useState(false);
  const totalAportes = aportes.reduce((acc, a) => acc + Number(a.monto), 0);
  const reinversionesAcum = capitalActual - capitalInicial - totalAportes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="inline-flex items-center gap-2">
            <Coins className="h-4 w-4 text-svi-gold" />
            Aportes adicionales
            <span className="text-xs text-svi-muted-2 font-normal">
              ({aportes.length})
            </span>
          </span>
          {estado === "activa" && !open && (
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar aporte
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DesgloseCapital
          moneda={moneda}
          capitalInicial={capitalInicial}
          totalAportes={totalAportes}
          reinversionesAcum={reinversionesAcum}
          capitalActual={capitalActual}
        />

        {open && (
          <NuevoAporteForm
            inversionId={inversionId}
            moneda={moneda}
            onClose={() => setOpen(false)}
          />
        )}

        {aportes.length === 0 ? (
          <p className="text-sm text-svi-muted-2 py-2">
            Sin aportes adicionales registrados.
          </p>
        ) : (
          <ul className="divide-y divide-svi-border-muted/50">
            {aportes.map((a) => (
              <li
                key={a.id}
                className="py-2 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-svi-gold">
                    + {formatCurrency(Number(a.monto), a.moneda as "ARS" | "USD")}
                  </p>
                  {a.motivo && (
                    <p className="text-xs text-svi-muted truncate">{a.motivo}</p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs text-svi-muted-2 font-mono">
                    {formatDate(a.fecha_aporte)}
                  </p>
                  {a.comprobante_url && (
                    <a
                      href={a.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-svi-gold hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Comprobante
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DesgloseCapital({
  moneda,
  capitalInicial,
  totalAportes,
  reinversionesAcum,
  capitalActual,
}: {
  moneda: "ARS" | "USD";
  capitalInicial: number;
  totalAportes: number;
  reinversionesAcum: number;
  capitalActual: number;
}) {
  return (
    <div className="rounded-lg border border-svi-border-muted/60 bg-svi-dark/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <Stat label="Capital inicial" value={formatCurrency(capitalInicial, moneda)} />
      <Stat
        label="+ Aportes"
        value={
          totalAportes > 0
            ? `+ ${formatCurrency(totalAportes, moneda)}`
            : "—"
        }
        positive={totalAportes > 0}
      />
      <Stat
        label="+ Reinversiones"
        value={
          reinversionesAcum > 0.005
            ? `+ ${formatCurrency(reinversionesAcum, moneda)}`
            : reinversionesAcum < -0.005
              ? formatCurrency(reinversionesAcum, moneda)
              : "—"
        }
        positive={reinversionesAcum > 0.005}
        negative={reinversionesAcum < -0.005}
      />
      <Stat
        label="Capital actual"
        value={formatCurrency(capitalActual, moneda)}
        highlight
      />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  positive,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
        {label}
      </p>
      <p
        className={`font-mono ${
          highlight
            ? "text-svi-gold font-bold"
            : positive
              ? "text-svi-success"
              : negative
                ? "text-svi-error"
                : "text-svi-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NuevoAporteForm({
  inversionId,
  moneda,
  onClose,
}: {
  inversionId: string;
  moneda: "ARS" | "USD";
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [monto, setMonto] = useState<string>("");
  const [fecha, setFecha] = useState<string>(today);
  const [motivo, setMotivo] = useState<string>("");
  const [comprobante, setComprobante] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      toast.error("Monto inválido");
      return;
    }
    startTransition(async () => {
      const res = await registrarAporte({
        inversion_id: inversionId,
        monto: montoNum,
        fecha_aporte: fecha,
        motivo: motivo.trim() || null,
        comprobante_url: comprobante.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Aporte registrado. Capital actual: ${formatCurrency(res.data.capital_actual_post, res.data.moneda)}`,
      );
      onClose();
    });
  }

  return (
    <div className="rounded-lg border border-svi-gold/40 bg-svi-gold/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm text-svi-gold">
          Registrar aporte adicional ({moneda})
        </h4>
        <button
          onClick={onClose}
          className="text-svi-muted-2 hover:text-svi-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="text-[10px] uppercase tracking-wider text-svi-muted-2"
            htmlFor="aporte-monto"
          >
            Monto
          </label>
          <input
            id="aporte-monto"
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="500000"
            className="w-full h-9 mt-1 rounded border border-svi-border-muted bg-svi-dark px-2 text-sm text-svi-white focus:border-svi-gold focus:outline-none font-mono"
          />
        </div>
        <div>
          <label
            className="text-[10px] uppercase tracking-wider text-svi-muted-2"
            htmlFor="aporte-fecha"
          >
            Fecha del aporte
          </label>
          <input
            id="aporte-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full h-9 mt-1 rounded border border-svi-border-muted bg-svi-dark px-2 text-sm text-svi-white focus:border-svi-gold focus:outline-none font-mono"
          />
        </div>
      </div>

      <div>
        <label
          className="text-[10px] uppercase tracking-wider text-svi-muted-2"
          htmlFor="aporte-motivo"
        >
          Motivo / observaciones
        </label>
        <input
          id="aporte-motivo"
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Aporte mensual, refuerzo de capital, etc."
          maxLength={500}
          className="w-full h-9 mt-1 rounded border border-svi-border-muted bg-svi-dark px-2 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
        />
      </div>

      <div>
        <label
          className="text-[10px] uppercase tracking-wider text-svi-muted-2"
          htmlFor="aporte-comp"
        >
          URL comprobante (opcional)
        </label>
        <input
          id="aporte-comp"
          type="url"
          value={comprobante}
          onChange={(e) => setComprobante(e.target.value)}
          placeholder="https://..."
          className="w-full h-9 mt-1 rounded border border-svi-border-muted bg-svi-dark px-2 text-sm text-svi-white focus:border-svi-gold focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Registrar
        </Button>
      </div>

      <p className="text-[11px] text-svi-muted-2 leading-relaxed pt-2 border-t border-svi-border-muted/50">
        El aporte suma al capital actual de la inversión y queda en el histórico.
        El contrato base no se modifica; si querés dejarlo asentado por escrito
        podés generar una nueva versión del contrato desde el panel superior.
      </p>
    </div>
  );
}
