"use client";

import { useTransition } from "react";
import { Receipt, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCurrency, formatDate } from "@repo/utils";
import { generarLiquidacion } from "@/modules/liquidaciones-inversion/actions";
import {
  LABEL_ESTADO,
  COLOR_ESTADO,
} from "@/modules/liquidaciones-inversion/schemas";
import type { LiquidacionListRow } from "@/modules/liquidaciones-inversion/queries";
import type { EstadoInversion } from "@/modules/inversiones/schemas";

interface Props {
  inversionId: string;
  estado: EstadoInversion;
  liquidaciones: LiquidacionListRow[];
}

export function LiquidacionesInversionPanel({
  inversionId,
  estado,
  liquidaciones,
}: Props) {
  const [pending, startTransition] = useTransition();

  function generarMesActual() {
    startTransition(async () => {
      const res = await generarLiquidacion({ inversion_id: inversionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.ya_existia) {
        toast.info("La liquidación de este mes ya existía.");
      } else {
        toast.success(
          `Liquidación generada por ${formatCurrency(res.data.monto_interes, "ARS")}`,
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="inline-flex items-center gap-2">
            <Receipt className="h-4 w-4 text-svi-gold" />
            Liquidaciones
            <span className="text-xs text-svi-muted-2 font-normal">
              ({liquidaciones.length})
            </span>
          </span>
          {estado === "activa" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={generarMesActual}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              Generar mes actual
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {liquidaciones.length === 0 ? (
          <p className="text-sm text-svi-muted-2 py-4">
            Sin liquidaciones registradas todavía.
            {estado === "activa" &&
              " Usá el botón para generar la del mes corriente, o esperá al cron del 1° de cada mes."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-svi-border-muted/50">
                  <Th>Período</Th>
                  <Th>Capital base</Th>
                  <Th>Interés</Th>
                  <Th>Estado</Th>
                  <Th>Pago</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-svi-border-muted/40">
                {liquidaciones.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 font-mono text-xs">
                      {formatPeriodoCompacto(l.periodo)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-svi-muted">
                      {formatCurrency(
                        Number(l.capital_base),
                        l.moneda as "ARS" | "USD",
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-svi-gold">
                      {formatCurrency(
                        Number(l.monto_interes),
                        l.moneda as "ARS" | "USD",
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${COLOR_ESTADO[l.estado]}`}
                      >
                        {LABEL_ESTADO[l.estado]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-svi-muted-2">
                      {l.fecha_pago ? formatDate(l.fecha_pago) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-svi-muted-2">
      {children}
    </th>
  );
}

function formatPeriodoCompacto(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${meses[Number(m[2]) - 1]} ${m[1]}`;
}
