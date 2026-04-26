"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button, Field, Input } from "@repo/ui";

export function LoginForm({ audience }: { audience: "cliente" | "inversor" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Stub: la integración real con Supabase Auth se cablea cuando el proyecto Supabase esté creado.
    // Por ahora simulamos un login para demostración.
    await new Promise((r) => setTimeout(r, 600));

    if (!email.includes("@") || password.length < 6) {
      setError("Verificá los datos ingresados.");
      setLoading(false);
      return;
    }

    router.push(`/portal/${audience}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Correo electrónico" htmlFor="email" required>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
          />
        </div>
      </Field>

      <Field label="Contraseña" htmlFor="password" required>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-svi-muted-2" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="pl-10"
          />
        </div>
      </Field>

      {error && (
        <div role="alert" className="rounded-lg border border-svi-error/40 bg-svi-error/10 px-3 py-2 text-sm text-svi-error">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ingresar <ArrowRight className="h-4 w-4" /></>}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/portal" className="text-svi-muted-2 hover:text-svi-gold">
          Cambiar tipo de acceso
        </Link>
        <a href="mailto:soporte@svi.com.ar" className="text-svi-gold hover:underline">
          ¿Olvidaste tu clave?
        </a>
      </div>
    </form>
  );
}
