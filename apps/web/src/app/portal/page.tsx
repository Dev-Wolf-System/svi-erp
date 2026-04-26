import Link from "next/link";
import { Users, TrendingUp, ArrowRight } from "lucide-react";
import { Button, GlassPanel } from "@repo/ui";

export default function PortalIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 md:px-10 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
          Acceso privado
        </span>
        <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold text-svi-white">
          Bienvenido al <span className="gradient-text">portal SVI</span>
        </h1>
        <p className="mt-4 text-svi-muted-2">
          Elegí tu tipo de acceso para iniciar sesión.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <PortalCard
          icon={Users}
          accent="red"
          title="Soy cliente"
          description="Seguí el estado de tu compra, descargá comprobantes y consultá tu cuenta corriente."
          href="/portal/login?tipo=cliente"
        />
        <PortalCard
          icon={TrendingUp}
          accent="gold"
          title="Soy inversor"
          description="Capital actual, rendimientos, próximas liquidaciones y descarga de contratos."
          href="/portal/login?tipo=inversor"
        />
      </div>

      <p className="mt-12 text-center text-xs text-svi-muted-2">
        ¿Sos personal de SVI?{" "}
        <a
          href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "/"}
          className="text-svi-gold hover:underline"
        >
          Ingresá al sistema interno
        </a>
      </p>
    </div>
  );
}

function PortalCard({
  icon: Icon,
  accent,
  title,
  description,
  href,
}: {
  icon: typeof Users;
  accent: "red" | "gold";
  title: string;
  description: string;
  href: string;
}) {
  const colors =
    accent === "red"
      ? "border-svi-red/30 hover:border-svi-red/60 [--ic:bg-svi-red/10] [--it:text-svi-red]"
      : "border-svi-gold/30 hover:border-svi-gold/60 [--ic:bg-svi-gold/10] [--it:text-svi-gold]";

  return (
    <Link href={href}>
      <GlassPanel className={`p-8 cursor-pointer transition-all ${colors}`}>
        <div
          className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${
            accent === "red" ? "bg-svi-red/10" : "bg-svi-gold/10"
          }`}
        >
          <Icon className={accent === "red" ? "h-6 w-6 text-svi-red" : "h-6 w-6 text-svi-gold"} />
        </div>
        <h3 className="mt-5 font-display text-xl font-semibold text-svi-white">{title}</h3>
        <p className="mt-2 text-sm text-svi-muted-2 leading-relaxed">{description}</p>
        <Button
          variant="ghost"
          className={`mt-5 px-0 ${accent === "red" ? "text-svi-red" : "text-svi-gold"}`}
        >
          Continuar <ArrowRight className="h-4 w-4" />
        </Button>
      </GlassPanel>
    </Link>
  );
}
