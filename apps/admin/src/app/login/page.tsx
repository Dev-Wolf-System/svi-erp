import { Suspense } from "react";
import { Logo } from "@repo/ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Lado branded */}
      <aside className="hidden lg:flex flex-col justify-between p-12 hero-mesh relative overflow-hidden">
        <div className="bg-grid-pattern absolute inset-0 opacity-50" aria-hidden />
        <div className="noise-overlay" aria-hidden />
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-svi-gold">
            Sistema interno
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold text-svi-white leading-tight">
            La columna vertebral
            <br />
            <span className="gradient-text">digital de SVI.</span>
          </h2>
          <p className="mt-4 text-sm text-svi-muted-2 max-w-md">
            Stock, ventas, inversiones, caja y reportes — todo en un panel diseñado
            para que el equipo de SVI tome mejores decisiones, más rápido.
          </p>
        </div>
        <p className="relative text-xs text-svi-muted-2 font-mono">
          v0.1.0 · Aguilares · Concepción · S.M. de Tucumán
        </p>
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          <h1 className="font-display text-3xl font-bold text-svi-white">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-svi-muted-2">
            Ingresá con tu correo corporativo SVI.
          </p>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
