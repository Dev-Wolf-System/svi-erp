import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewBancoForm } from "./new-banco-form";

export const metadata = { title: "Nuevo banco" };

export default function NewBancoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/bancos"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            Gestión · alta
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nuevo banco
          </h1>
        </div>
      </header>

      <NewBancoForm />
    </div>
  );
}
