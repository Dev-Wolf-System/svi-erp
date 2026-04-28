import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewInversorForm } from "./new-inversor-form";

export const metadata = { title: "Nuevo inversor" };

export default function NuevoInversorPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/inversores"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            FCI · alta de inversor
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nuevo inversor
          </h1>
        </div>
      </header>

      <NewInversorForm />
    </div>
  );
}
