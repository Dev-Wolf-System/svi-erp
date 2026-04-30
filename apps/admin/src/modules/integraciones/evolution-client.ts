import "server-only";

/**
 * Cliente HTTP server-only para Evolution API.
 *
 * Lee `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` y `EVOLUTION_INSTANCE_NAME`
 * del entorno. Nunca expone la apikey al cliente — todas las llamadas se
 * encadenan desde server actions que verifican rol admin/super_admin.
 */

export type EvoConnectionState = "open" | "close" | "connecting";

export type EvoInstanceStatus = {
  instance_name: string;
  state: EvoConnectionState;
  owner: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
};

export type EvoQrCode = {
  /** data URL `data:image/png;base64,...` listo para <img src> */
  base64: string;
  /** Código WA crudo (no se usa en UI pero útil para debug) */
  code: string;
  /** Cantidad de QRs generados (count) */
  count: number;
  /** Código de pareo numérico opcional (pairing code, si la versión lo emite) */
  pairing_code: string | null;
};

export class EvolutionApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "EvolutionApiError";
  }
}

function getConfig() {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME ?? "SVI-ERP";

  if (!url || !key) {
    throw new EvolutionApiError(
      500,
      "EVOLUTION_API_URL y EVOLUTION_API_KEY deben estar configurados en .env",
    );
  }

  return { url: url.replace(/\/$/, ""), key, instance };
}

async function evoFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : `Evolution API ${path} → HTTP ${res.status}`;
    throw new EvolutionApiError(res.status, msg, data);
  }

  return data as T;
}

/**
 * Devuelve el estado actual de la instancia + datos del owner conectado.
 * Combina `connectionState` con `fetchInstances` (la primera no trae owner).
 */
export async function getInstanceStatus(): Promise<EvoInstanceStatus> {
  const { instance } = getConfig();

  const [stateRaw, instancesRaw] = await Promise.all([
    evoFetch<{
      instance: { instanceName: string; state: EvoConnectionState };
    }>(`/instance/connectionState/${instance}`),
    evoFetch<unknown[]>(`/instance/fetchInstances?instanceName=${instance}`),
  ]);

  const state = stateRaw.instance?.state ?? "close";

  const found = (instancesRaw ?? []).find((row) => {
    const r = row as { instance?: { instanceName?: string }; instanceName?: string };
    return (
      (r.instance?.instanceName ?? r.instanceName) ===
      stateRaw.instance.instanceName
    );
  }) as
    | {
        instance?: {
          instanceName?: string;
          owner?: string | null;
          profileName?: string | null;
          profilePictureUrl?: string | null;
        };
        instanceName?: string;
        owner?: string | null;
        profileName?: string | null;
        profilePictureUrl?: string | null;
      }
    | undefined;

  const meta = found?.instance ?? found ?? {};

  return {
    instance_name: stateRaw.instance.instanceName,
    state,
    owner: (meta.owner ?? null) || null,
    profile_name: (meta.profileName ?? null) || null,
    profile_picture_url: (meta.profilePictureUrl ?? null) || null,
  };
}

/**
 * Solicita un nuevo QR. Si la instancia ya está `open`, Evolution responde
 * con state actual (sin QR). Si está `close`/`connecting`, devuelve QR
 * base64 listo para mostrar.
 */
export async function requestQrCode(): Promise<EvoQrCode> {
  const { instance } = getConfig();
  const data = await evoFetch<{
    base64?: string;
    code?: string;
    count?: number;
    pairingCode?: string | null;
  }>(`/instance/connect/${instance}`);

  if (!data.base64) {
    throw new EvolutionApiError(
      409,
      "Evolution no devolvió QR — la instancia probablemente ya está conectada. Refrescá el estado.",
      data,
    );
  }

  return {
    base64: data.base64,
    code: data.code ?? "",
    count: data.count ?? 0,
    pairing_code: data.pairingCode ?? null,
  };
}

/**
 * Cierra la sesión WhatsApp de la instancia. La próxima vez que se pida
 * `connect`, Evolution devuelve un QR nuevo (force re-pairing).
 */
export async function logoutInstance(): Promise<void> {
  const { instance } = getConfig();
  await evoFetch(`/instance/logout/${instance}`, { method: "DELETE" });
}

/**
 * Reinicia la instancia (útil si quedó en estado inconsistente).
 */
export async function restartInstance(): Promise<void> {
  const { instance } = getConfig();
  await evoFetch(`/instance/restart/${instance}`, { method: "POST" });
}
