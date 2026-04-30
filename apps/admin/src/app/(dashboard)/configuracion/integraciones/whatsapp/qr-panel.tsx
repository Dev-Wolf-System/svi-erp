"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Power,
  QrCode,
  RefreshCw,
  RotateCcw,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEvolutionStatus,
  regenerateEvolutionQr,
  disconnectEvolutionInstance,
  restartEvolutionInstance,
  type EvoConnectionState,
  type EvoInstanceStatus,
  type EvoQrCode,
} from "@/modules/integraciones";

const POLL_INTERVAL_MS = 3000;

type Props = {
  initialStatus: EvoInstanceStatus | null;
  initialError: string | null;
  instanceName: string;
};

export function EvolutionWhatsappPanel({
  initialStatus,
  initialError,
  instanceName,
}: Props) {
  const [status, setStatus] = useState<EvoInstanceStatus | null>(initialStatus);
  const [statusError, setStatusError] = useState<string | null>(initialError);
  const [qr, setQr] = useState<EvoQrCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<
    null | "regenerate" | "disconnect" | "restart"
  >(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async (): Promise<EvoConnectionState | null> => {
    const res = await fetchEvolutionStatus();
    if (!isMountedRef.current) return null;
    if (res.ok) {
      setStatus(res.data);
      setStatusError(null);
      return res.data.state;
    }
    setStatusError(res.error);
    return null;
  }, []);

  // Polling automático mientras la instancia no esté abierta.
  useEffect(() => {
    if (!status) return;
    if (status.state === "open") return;

    const id = setInterval(() => {
      refreshStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [status, refreshStatus]);

  // Limpiar QR cuando la instancia pasa a "open".
  useEffect(() => {
    if (status?.state === "open" && qr) {
      setQr(null);
    }
  }, [status, qr]);

  function handleRegenerate() {
    setActionLoading("regenerate");
    startTransition(async () => {
      const res = await regenerateEvolutionQr();
      if (!isMountedRef.current) return;
      if (res.ok) {
        setQr(res.data);
        toast.success("QR generado — escaneá desde WhatsApp", { duration: 5000 });
        await refreshStatus();
      } else {
        toast.error(res.error);
      }
      setActionLoading(null);
    });
  }

  function handleDisconnect() {
    if (
      !confirm(
        "¿Desconectar la sesión de WhatsApp? Vas a tener que volver a escanear el QR.",
      )
    )
      return;
    setActionLoading("disconnect");
    startTransition(async () => {
      const res = await disconnectEvolutionInstance();
      if (!isMountedRef.current) return;
      if (res.ok) {
        setQr(null);
        toast.success("WhatsApp desconectado");
        await refreshStatus();
      } else {
        toast.error(res.error);
      }
      setActionLoading(null);
    });
  }

  function handleRestart() {
    setActionLoading("restart");
    startTransition(async () => {
      const res = await restartEvolutionInstance();
      if (!isMountedRef.current) return;
      if (res.ok) {
        toast.success("Instancia reiniciada");
        await refreshStatus();
      } else {
        toast.error(res.error);
      }
      setActionLoading(null);
    });
  }

  const state: EvoConnectionState = status?.state ?? "close";
  const stateMeta = STATE_META[state];

  return (
    <section className="rounded-xl border border-svi-border-muted bg-svi-card overflow-hidden">
      <header className="px-5 py-4 border-b border-svi-border-muted flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-lg flex items-center justify-center ${stateMeta.iconBg}`}
          >
            <stateMeta.Icon className={`size-5 ${stateMeta.iconColor}`} />
          </div>
          <div>
            <h2 className="font-display text-svi-white">{instanceName}</h2>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider ${stateMeta.textColor}`}
              >
                <span
                  className={`size-1.5 rounded-full ${stateMeta.dotBg} ${state !== "open" ? "animate-pulse" : ""}`}
                />
                {stateMeta.label}
              </span>
              {status?.profile_name && (
                <span className="text-xs text-svi-muted">
                  · {status.profile_name}
                </span>
              )}
              {status?.owner && (
                <span className="text-xs font-mono text-svi-muted-2">
                  · {formatOwner(status.owner)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refreshStatus()}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition disabled:opacity-50"
          title="Refrescar estado"
        >
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </header>

      <div className="p-5">
        {statusError ? (
          <ErrorBanner error={statusError} onRetry={refreshStatus} />
        ) : state === "open" ? (
          <ConnectedView status={status} onDisconnect={handleDisconnect} loading={actionLoading === "disconnect"} />
        ) : (
          <DisconnectedView
            qr={qr}
            state={state}
            onRegenerate={handleRegenerate}
            onRestart={handleRestart}
            loading={actionLoading}
          />
        )}
      </div>
    </section>
  );
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

function ConnectedView({
  status,
  onDisconnect,
  loading,
}: {
  status: EvoInstanceStatus | null;
  onDisconnect: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-svi-success/10 border border-svi-success/30">
        <CheckCircle2 className="size-5 text-svi-success shrink-0" />
        <div className="text-sm">
          <p className="text-svi-white">WhatsApp conectado y listo para enviar mensajes.</p>
          {status?.owner && (
            <p className="text-svi-muted-2 font-mono text-xs mt-0.5">
              Número: {formatOwner(status.owner)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDisconnect}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-svi-error/40 text-svi-error hover:bg-svi-error/10 transition text-sm disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Power className="size-4" />
          )}
          Desconectar
        </button>
      </div>
    </div>
  );
}

function DisconnectedView({
  qr,
  state,
  onRegenerate,
  onRestart,
  loading,
}: {
  qr: EvoQrCode | null;
  state: EvoConnectionState;
  onRegenerate: () => void;
  onRestart: () => void;
  loading: null | "regenerate" | "disconnect" | "restart";
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div className="space-y-3">
          <h3 className="font-display text-svi-white">Vincular WhatsApp</h3>
          <ol className="text-sm text-svi-muted space-y-2 list-decimal pl-4 leading-relaxed">
            <li>Abrí WhatsApp en el teléfono del owner.</li>
            <li>
              Tocá <strong>Configuración → Dispositivos vinculados</strong>.
            </li>
            <li>
              Tocá <strong>Vincular dispositivo</strong> y escaneá el QR.
            </li>
            <li>
              Esperá unos segundos — esta página detecta la conexión sola.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-svi-gold text-svi-black hover:opacity-90 transition text-sm font-medium disabled:opacity-50"
            >
              {loading === "regenerate" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <QrCode className="size-4" />
              )}
              {qr ? "Regenerar QR" : "Generar QR"}
            </button>
            <button
              type="button"
              onClick={onRestart}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition text-sm disabled:opacity-50"
            >
              {loading === "restart" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Reiniciar instancia
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          {qr ? (
            <div className="bg-white p-3 rounded-xl shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.base64}
                alt="QR para vincular WhatsApp"
                className="w-64 h-64 block"
              />
              <p className="text-center text-xs text-svi-black mt-2 font-mono">
                QR #{qr.count} · expira en ~60s
              </p>
            </div>
          ) : (
            <div className="w-72 h-72 rounded-xl border-2 border-dashed border-svi-border-muted flex flex-col items-center justify-center text-svi-muted-2 gap-2">
              <QrCode className="size-12" />
              <p className="text-sm text-center px-4">
                Apretá <strong>Generar QR</strong> para mostrar el código.
              </p>
              {state === "connecting" && (
                <p className="text-xs text-svi-warning">
                  Estado: conectando... esperando escaneo.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-svi-error/10 border border-svi-error/30">
        <WifiOff className="size-5 text-svi-error shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-svi-white font-medium">No se pudo conectar con Evolution API</p>
          <p className="text-svi-muted mt-1">{error}</p>
          <p className="text-svi-muted-2 mt-2 text-xs">
            Verificá que <code className="font-mono">EVOLUTION_API_URL</code> y{" "}
            <code className="font-mono">EVOLUTION_API_KEY</code> estén configurados
            en <code className="font-mono">apps/admin/.env</code>.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-svi-border-muted text-svi-muted hover:text-svi-white hover:bg-svi-elevated transition text-sm"
      >
        <RefreshCw className="size-4" />
        Reintentar
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATE_META = {
  open: {
    label: "Conectado",
    Icon: CheckCircle2,
    iconBg: "bg-svi-success/15",
    iconColor: "text-svi-success",
    textColor: "text-svi-success",
    dotBg: "bg-svi-success",
  },
  close: {
    label: "Desconectado",
    Icon: WifiOff,
    iconBg: "bg-svi-error/15",
    iconColor: "text-svi-error",
    textColor: "text-svi-error",
    dotBg: "bg-svi-error",
  },
  connecting: {
    label: "Conectando",
    Icon: Smartphone,
    iconBg: "bg-svi-warning/15",
    iconColor: "text-svi-warning",
    textColor: "text-svi-warning",
    dotBg: "bg-svi-warning",
  },
} satisfies Record<
  EvoConnectionState,
  {
    label: string;
    Icon: typeof CheckCircle2;
    iconBg: string;
    iconColor: string;
    textColor: string;
    dotBg: string;
  }
>;

function formatOwner(owner: string): string {
  // owner viene como "5491165432123@s.whatsapp.net" — limpiar
  const justNum = owner.split("@")[0]?.replace(/\D/g, "");
  if (!justNum) return owner;
  if (justNum.length === 13 && justNum.startsWith("549")) {
    // +54 9 11 6543-2123
    return `+${justNum.slice(0, 2)} ${justNum.slice(2, 3)} ${justNum.slice(3, 5)} ${justNum.slice(5, 9)}-${justNum.slice(9)}`;
  }
  return `+${justNum}`;
}
