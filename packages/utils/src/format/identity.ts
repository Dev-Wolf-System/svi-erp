/**
 * Formato y validación de identificadores AR.
 * No reemplaza validación de servidor — solo UX.
 */

/** "20-12345678-9" → CUIT formateado, devuelve null si inválido */
export function formatCuit(cuit: string | null | undefined): string {
  if (!cuit) return "—";
  const digits = cuit.replace(/\D/g, "");
  if (digits.length !== 11) return cuit;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Validación dígito verificador CUIT (ley AFIP) */
export function isValidCuit(cuit: string | null | undefined): boolean {
  if (!cuit) return false;
  const digits = cuit.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * mult[i]!;
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) return false;
  return dv === Number(digits[10]);
}

/** Formato de patente AR (vieja "AAA123" o nueva Mercosur "AA123BB") */
export function formatPatente(patente: string | null | undefined): string {
  if (!patente) return "—";
  return patente.toUpperCase().replace(/\s/g, "");
}

export function formatDni(dni: string | null | undefined): string {
  if (!dni) return "—";
  const digits = dni.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 8) return dni;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
