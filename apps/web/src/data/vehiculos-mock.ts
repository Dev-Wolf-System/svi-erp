/**
 * Mock data temporal para landing/preview.
 * Reemplazar por fetch real a Supabase en Fase 3 (catálogo público SSG/ISR).
 */
export interface VehiculoPreview {
  id: string;
  marca: string;
  modelo: string;
  version: string;
  anio: number;
  tipo: "auto" | "4x4" | "camioneta" | "moto" | "utilitario";
  condicion: "0km" | "usado";
  kilometraje?: number;
  combustible: string;
  precio: number;
  moneda: "ARS" | "USD";
  imagen: string;
  sucursal: "Aguilares" | "Concepción" | "S.M. de Tucumán";
  destacado?: boolean;
}

export const vehiculosMock: VehiculoPreview[] = [
  {
    id: "1",
    marca: "Toyota",
    modelo: "Hilux",
    version: "SRX 4x4 AT",
    anio: 2023,
    tipo: "4x4",
    condicion: "usado",
    kilometraje: 45000,
    combustible: "Diesel",
    precio: 42_000_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=900&q=80",
    sucursal: "Aguilares",
    destacado: true,
  },
  {
    id: "2",
    marca: "Toyota",
    modelo: "Corolla",
    version: "XEi 2.0 CVT",
    anio: 2026,
    tipo: "auto",
    condicion: "0km",
    combustible: "Nafta",
    precio: 28_500_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1623869675781-80aa31012c78?w=900&q=80",
    sucursal: "Aguilares",
  },
  {
    id: "3",
    marca: "Volkswagen",
    modelo: "Amarok",
    version: "V6 Highline",
    anio: 2026,
    tipo: "camioneta",
    condicion: "0km",
    combustible: "Diesel",
    precio: 58_900_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    sucursal: "Concepción",
    destacado: true,
  },
  {
    id: "4",
    marca: "Ford",
    modelo: "Focus",
    version: "Titanium 2.0",
    anio: 2021,
    tipo: "auto",
    condicion: "usado",
    kilometraje: 62000,
    combustible: "Nafta",
    precio: 18_500_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=900&q=80",
    sucursal: "Concepción",
  },
  {
    id: "5",
    marca: "Honda",
    modelo: "CB 500F",
    version: "Standard",
    anio: 2026,
    tipo: "moto",
    condicion: "0km",
    combustible: "Nafta",
    precio: 9_800_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80",
    sucursal: "S.M. de Tucumán",
  },
  {
    id: "6",
    marca: "Renault",
    modelo: "Kangoo",
    version: "Express",
    anio: 2022,
    tipo: "utilitario",
    condicion: "usado",
    kilometraje: 38000,
    combustible: "Diesel",
    precio: 15_700_000,
    moneda: "ARS",
    imagen: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=900&q=80",
    sucursal: "S.M. de Tucumán",
  },
];
