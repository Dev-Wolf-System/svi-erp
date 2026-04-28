"use client";

import { useState, useTransition } from "react";
import {
  Receipt,
  CreditCard,
  FileSignature,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import {
  emitirFacturaAfip,
  crearPreferenciaMP,
  generarContratoVentaPdf,
  getSignedContratoUrl,
} from "@/modules/ventas/integraciones";

interface Props {
  ventaId: string;
  cae: string | null;
  caeVencimiento: string | null;
  afipDriver: string | null;
  comprobanteAfipUrl: string | null;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  mpStatus: string | null;
  mpInitPoint: string | null;
  contratoPath: string | null;
  precioFinal: number;
  moneda: string;
}

export function AccionesCard(props: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <AfipCard {...props} />
      <MercadoPagoCard {...props} />
      <ContratoCard {...props} />
    </div>
  );
}

function AfipCard({
  ventaId,
  cae,
  caeVencimiento,
  afipDriver,
  comprobanteAfipUrl,
}: Props) {
  const [pending, startTransition] = useTransition();

  function emitir() {
    startTransition(async () => {
      const res = await emitirFacturaAfip(ventaId);
      if (!res.ok) toast.error(res.error);
      else toast.success(`CAE emitido: ${res.data.cae}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-svi-gold" />
          Factura AFIP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cae ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                CAE
              </p>
              <p className="font-mono text-svi-success">{cae}</p>
            </div>
            <p className="text-xs text-svi-muted">
              Vence: {caeVencimiento ?? "—"} · driver: {afipDriver ?? "stub"}
            </p>
            {comprobanteAfipUrl ? (
              <a
                href={comprobanteAfipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-svi-gold hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver comprobante
              </a>
            ) : (
              <p className="text-[11px] text-svi-muted-2">
                Comprobante PDF disponible al pasar a driver real (stub no genera archivo).
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-svi-muted-2">
              Sin CAE emitido. Driver actual:{" "}
              <span className="font-mono">
                {process.env.NEXT_PUBLIC_AFIP_DRIVER ?? "stub"}
              </span>
              .
            </p>
            <Button onClick={emitir} disabled={pending} size="sm">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Emitir factura
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MercadoPagoCard({
  ventaId,
  mpPreferenceId,
  mpPaymentId,
  mpStatus,
  mpInitPoint,
  precioFinal,
  moneda,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState<number>(Math.round(precioFinal * 0.1));
  const [freshInitPoint, setFreshInitPoint] = useState<string | null>(null);

  const activeLink = freshInitPoint ?? mpInitPoint;

  function crear() {
    if (moneda !== "ARS") {
      toast.error("Mercado Pago AR sólo acepta ARS");
      return;
    }
    startTransition(async () => {
      const res = await crearPreferenciaMP(ventaId, monto);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFreshInitPoint(res.data.init_point);
      toast.success("Preferencia creada — link de pago listo");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-svi-gold" />
          Cobro online (Seña)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mpPaymentId ? (
          <div className="text-sm space-y-1">
            <p className="text-svi-success font-medium">Pago confirmado</p>
            <p className="font-mono text-xs text-svi-muted">{mpPaymentId}</p>
            <p className="text-xs text-svi-muted">Estado: {mpStatus ?? "—"}</p>
          </div>
        ) : (
          <>
            {activeLink && (
              <div className="rounded-lg border border-svi-gold/30 bg-svi-gold/5 p-3 space-y-2">
                <p className="text-xs text-svi-muted-2">Link de pago activo</p>
                <a
                  href={activeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-svi-gold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir checkout
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="h-9 w-32 rounded-lg border border-svi-border-muted bg-svi-dark px-3 text-sm font-mono text-svi-white focus:border-svi-gold focus:outline-none"
              />
              <span className="text-xs text-svi-muted-2">
                {formatCurrency(monto, "ARS")}
              </span>
            </div>
            <Button onClick={crear} disabled={pending} size="sm">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {mpPreferenceId ? "Regenerar link" : "Generar link"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContratoCard({ ventaId, contratoPath }: Props) {
  const [pending, startTransition] = useTransition();
  const [viewing, startView] = useTransition();

  function generar() {
    startTransition(async () => {
      const res = await generarContratoVentaPdf(ventaId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contrato generado");
      window.open(res.data.signed_url, "_blank");
    });
  }

  function ver() {
    startView(async () => {
      const res = await getSignedContratoUrl(ventaId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.data.signed_url, "_blank");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-svi-gold" />
          Contrato PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contratoPath ? (
          <p className="text-xs text-svi-success">
            Contrato generado y archivado en Storage.
          </p>
        ) : (
          <p className="text-sm text-svi-muted-2">Sin contrato generado.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {contratoPath && (
            <Button onClick={ver} disabled={viewing} size="sm" variant="ghost">
              {viewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Ver contrato
            </Button>
          )}
          <Button onClick={generar} disabled={pending} size="sm">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4" />
            )}
            {contratoPath ? "Generar nueva versión" : "Generar contrato"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
