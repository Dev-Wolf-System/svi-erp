import { notFound, redirect } from "next/navigation";
import { can } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import { fetchEvolutionStatus } from "@/modules/integraciones";
import { EvolutionWhatsappPanel } from "./qr-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "WhatsApp · Integraciones · SVI",
};

export default async function WhatsappIntegracionPage() {
  const claims = await getSviClaims();
  if (!claims) redirect("/login");
  if (!can("config.integraciones", claims.rol)) notFound();

  const initial = await fetchEvolutionStatus();

  const evolutionUrl = process.env.EVOLUTION_API_URL ?? "—";
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME ?? "SVI-ERP";
  const apiKeyConfigured = !!process.env.EVOLUTION_API_KEY;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-svi-muted-2">
          Configuración · Integraciones
        </p>
        <h1 className="text-3xl font-display tracking-tight text-svi-white">
          WhatsApp · Evolution API
        </h1>
        <p className="text-sm text-svi-muted">
          Conectá el WhatsApp del owner para que SVI pueda enviar
          notificaciones, recordatorios y ejecutar el agente IA por chat.
        </p>
      </header>

      <section className="rounded-xl border border-svi-border-muted bg-svi-card p-5 space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-widest text-svi-muted-2">
          Endpoint
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-svi-muted-2 text-xs uppercase tracking-wider">
              Instancia
            </dt>
            <dd className="font-mono text-svi-white">{instanceName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-svi-muted-2 text-xs uppercase tracking-wider">
              URL
            </dt>
            <dd className="font-mono text-svi-white break-all">{evolutionUrl}</dd>
          </div>
          <div>
            <dt className="text-svi-muted-2 text-xs uppercase tracking-wider">
              API Key
            </dt>
            <dd
              className={
                apiKeyConfigured
                  ? "text-svi-success font-mono"
                  : "text-svi-error font-mono"
              }
            >
              {apiKeyConfigured ? "✓ configurada" : "✗ falta en .env"}
            </dd>
          </div>
        </dl>
      </section>

      <EvolutionWhatsappPanel
        initialStatus={initial.ok ? initial.data : null}
        initialError={initial.ok ? null : initial.error}
        instanceName={instanceName}
      />

      <section className="rounded-xl border border-svi-border-muted bg-svi-card p-5 space-y-2 text-sm text-svi-muted leading-relaxed">
        <h2 className="text-sm font-mono uppercase tracking-widest text-svi-muted-2 mb-1">
          Cómo funciona
        </h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Si la instancia está <strong>desconectada</strong>, vas a ver un QR.
            Escanealo desde WhatsApp del owner (Configuración → Dispositivos
            vinculados → Vincular dispositivo).
          </li>
          <li>
            Mientras esperás el escaneo, el panel hace polling cada 3 segundos
            y se actualiza solo cuando WhatsApp confirma el vínculo.
          </li>
          <li>
            <strong>Regenerar QR</strong> fuerza un código nuevo (los QRs caducan
            cada ~60s). Útil si vas demasiado lento escaneando.
          </li>
          <li>
            <strong>Desconectar</strong> cierra la sesión del WhatsApp vinculado.
            Después de esto, el próximo "Regenerar QR" produce un código fresco.
          </li>
          <li>
            <strong>Reiniciar</strong> reinicia la instancia de Evolution sin
            perder el vínculo (útil si quedó en estado inconsistente).
          </li>
        </ol>
      </section>
    </div>
  );
}
