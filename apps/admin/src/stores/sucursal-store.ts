"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SucursalState {
  sucursalActivaId: string | null;
  sucursalActivaNombre: string | null;
  setSucursal: (id: string, nombre: string) => void;
  clear: () => void;
}

/** Sucursal activa en el panel — persistida en localStorage */
export const useSucursalStore = create<SucursalState>()(
  persist(
    (set) => ({
      sucursalActivaId: null,
      sucursalActivaNombre: null,
      setSucursal: (id, nombre) =>
        set({ sucursalActivaId: id, sucursalActivaNombre: nombre }),
      clear: () => set({ sucursalActivaId: null, sucursalActivaNombre: null }),
    }),
    { name: "svi:sucursal-activa" },
  ),
);
