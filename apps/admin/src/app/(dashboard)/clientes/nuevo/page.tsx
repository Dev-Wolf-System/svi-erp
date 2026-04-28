import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewClienteForm } from "./new-cliente-form";

export const metadata = { title: "Nuevo cliente" };

export default function NewClientePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/clientes"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-svi-muted-2 hover:text-svi-white hover:bg-svi-elevated"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-svi-gold">
            CRM · alta
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-svi-white">
            Nuevo cliente
          </h1>
        </div>
      </header>

      <NewClienteForm />
    </div>
  );
}
