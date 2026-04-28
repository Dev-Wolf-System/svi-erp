export { renderContratoVenta } from "./render";
export type { RenderContratoOptions } from "./render";
export { ContratoVentaDocument } from "./template";
export type { ContratoVentaIntegrity } from "./template";
export { contratoVentaSchema, type ContratoVentaData } from "./schema";
export {
  canonicalContratoPayload,
  computeContratoHash,
  shortHash,
  buildVerifyUrl,
} from "./canonical";
