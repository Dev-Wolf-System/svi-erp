import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInversoresParaSelect } from "@/modules/inversiones/queries";
import { NewInversionForm } from "./new-inversion-form";

export const metadata = { title: "Nueva inversión" };

export default async function NuevaInversionPage() {
  const inversores = await getInversoresParaSelect();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/inversiones"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · alta de inversión
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nueva inversión
          </h1>
        </div>
      </header>

      {inversores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-svi-border-muted bg-svi-card/40 p-10 text-center">
          <p className="text-sm text-svi-muted-2">
            Primero registrá un inversor en{" "}
            <Link href="/inversores/nuevo" className="text-svi-gold hover:underline">
              /inversores/nuevo
            </Link>
            .
          </p>
        </div>
      ) : (
        <NewInversionForm inversores={inversores} />
      )}
    </div>
  );
}
