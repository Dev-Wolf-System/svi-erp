"use server";

import { revalidatePath } from "next/cache";
import { assertCan } from "@repo/utils";
import { getSviClaims } from "@/lib/auth/claims";
import {
  getInstanceStatus,
  requestQrCode,
  logoutInstance,
  restartInstance,
  EvolutionApiError,
  type EvoInstanceStatus,
  type EvoQrCode,
} from "./evolution-client";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function authorize() {
  const claims = await getSviClaims();
  if (!claims) throw new Error("No autenticado");
  assertCan("config.integraciones", claims.rol);
  return claims;
}

function toResult<T>(promise: Promise<T>): Promise<ActionResult<T>> {
  return promise
    .then<ActionResult<T>>((data) => ({ ok: true, data }))
    .catch((err: unknown) => {
      const msg =
        err instanceof EvolutionApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Error desconocido";
      return { ok: false, error: msg };
    });
}

export async function fetchEvolutionStatus(): Promise<
  ActionResult<EvoInstanceStatus>
> {
  await authorize();
  return toResult(getInstanceStatus());
}

export async function regenerateEvolutionQr(): Promise<ActionResult<EvoQrCode>> {
  await authorize();
  const result = await toResult(requestQrCode());
  if (result.ok) revalidatePath("/configuracion/integraciones/whatsapp");
  return result;
}

export async function disconnectEvolutionInstance(): Promise<
  ActionResult<{ logged_out: true }>
> {
  await authorize();
  try {
    await logoutInstance();
    revalidatePath("/configuracion/integraciones/whatsapp");
    return { ok: true, data: { logged_out: true } };
  } catch (err) {
    const msg =
      err instanceof EvolutionApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido";
    return { ok: false, error: msg };
  }
}

export async function restartEvolutionInstance(): Promise<
  ActionResult<{ restarted: true }>
> {
  await authorize();
  try {
    await restartInstance();
    revalidatePath("/configuracion/integraciones/whatsapp");
    return { ok: true, data: { restarted: true } };
  } catch (err) {
    const msg =
      err instanceof EvolutionApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido";
    return { ok: false, error: msg };
  }
}
