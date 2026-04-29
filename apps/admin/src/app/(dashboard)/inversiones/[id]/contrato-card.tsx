"use client";

import { useTransition } from "react";
import { FileSignature, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import {
  generarContratoFciPdf,
  getSignedContratoFciUrl,
} from "@/modules/inversiones/integraciones";

interface Props {
  inversionId: string;
  contratoUrl: string | null;
  contratoVersion: number;
  contratoHash: string | null;
}

export function ContratoFciCard({
  inversionId,
  contratoUrl,
  contratoVersion,
  contratoHash,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [viewing, startView] = useTransition();

  function generar() {
    startTransition(async () => {
      const res = await generarContratoFciPdf(inversionId);
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
      const res = await getSignedContratoFciUrl(inversionId);
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
        {contratoUrl ? (
          <div className="space-y-1 text-xs">
            <p className="text-svi-success">
              Contrato firmado v{contratoVersion} archivado en Storage.
            </p>
            {contratoHash && (
              <p className="text-svi-muted-2 font-mono break-all">
                SHA-256: {contratoHash.slice(0, 16)}…
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-svi-muted-2">Sin contrato generado.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {contratoUrl && (
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
            {contratoUrl ? "Generar nueva versión" : "Generar contrato"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
