import { Suspense } from "react";
import { LoginForm } from "./login-form";

interface PageProps {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { tipo } = await searchParams;
  const audience = tipo === "inversor" ? "inversor" : "cliente";

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
          Portal {audience}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-svi-white">
          Iniciá sesión
        </h1>
        <p className="mt-2 text-sm text-svi-muted-2">
          Accedé con tu correo registrado y la clave que te enviamos.
        </p>
      </div>

      <Suspense>
        <LoginForm audience={audience} />
      </Suspense>
    </div>
  );
}
