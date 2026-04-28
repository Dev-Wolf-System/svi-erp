import { renderToBuffer } from "@react-pdf/renderer";
import { contratoVentaSchema, type ContratoVentaData } from "./schema";
import { ContratoVentaDocument } from "./template";

/**
 * Renderiza el Contrato de Venta SVI a un Buffer PDF listo para subir
 * a Storage o servir como descarga.
 *
 * Valida la entrada con Zod antes de renderizar — falla rápido si la
 * query del módulo `ventas` no devuelve el shape esperado.
 *
 * Server-only: depende de `node:stream` vía @react-pdf/renderer.
 * No invocar desde el cliente ni desde Edge runtime.
 */
export async function renderContratoVenta(data: ContratoVentaData): Promise<Buffer> {
  const validated = contratoVentaSchema.parse(data);
  return await renderToBuffer(<ContratoVentaDocument data={validated} />);
}
