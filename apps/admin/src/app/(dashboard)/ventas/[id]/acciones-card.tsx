"use client";

import { useState, useTransition } from "react";
import {
  Receipt,
  CreditCard,
  FileSignature,
  Loader2,
  ExternalLink,
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
} from "@/modules/ventas/integraciones";

interface Props {
  ventaId: string;
  cae: string | null;
  caeVencimiento: string | null;
  afipDriver: string | null;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  mpStatus: string | null;
  contratoPath: string | null;
  precioFinal: number;
  moneda: string;
}

export function AccionesCard(props: Props) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <AfipCard {...props} />
        <MercadoPagoCard {...props} />
        <ContratoCard {...props} />
      </div>
    </>
  );
}

function AfipCard({
  ventaId,
  cae,
  caeVencimiento,
  afipDriver,
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
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-svi-muted-2">
                CAE
              </p>
              <p className="font-mono text-svi-success">{cae}</p>
            </div>
            <p className="text-xs text-svi-muted">
              Vence: {caeVencimiento ?? "—"} · driver: {afipDriver ?? "stub"}
            </p>
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
  precioFinal,
  moneda,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState<number>(Math.round(precioFinal * 0.1));
  const [initPoint, setInitPoint] = useState<string | null>(null);

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
      setInitPoint(res.data.init_point);
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
          <div className="text-sm">
            <p className="text-svi-success">Pago confirmado</p>
            <p className="font-mono text-xs text-svi-muted">{mpPaymentId}</p>
            <p className="text-xs text-svi-muted">Estado: {mpStatus ?? "—"}</p>
          </div>
        ) : (
          <>
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
            {initPoint && (
              <a
                href={initPoint}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-svi-gold hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir checkout
              </a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContratoCard({ ventaId, contratoPath }: Props) {
  const [pending, startTransition] = useTransition();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  function generar() {
    startTransition(async () => {
      const res = await generarContratoVentaPdf(ventaId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSignedUrl(res.data.signed_url);
      toast.success("Contrato generado");
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
          <p className="text-xs text-svi-muted-2 font-mono break-all">
            {contratoPath}
          </p>
        ) : (
          <p className="text-sm text-svi-muted-2">Sin contrato generado.</p>
        )}
        <Button onClick={generar} disabled={pending} size="sm">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSignature className="h-4 w-4" />
          )}
          {contratoPath ? "Generar nueva versión" : "Generar contrato"}
        </Button>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-svi-gold hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Descargar nuevamente
          </a>
        )}
      </CardContent>
    </Card>
  );
}
