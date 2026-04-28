import { describe, it, expect } from "vitest";
import { verifyMpSignature, signMpManifest } from "../webhook-validator";

const SECRET = "test-secret-svi-2026";
const DATA_ID = "1234567890";
const REQUEST_ID = "req-abc-xyz";
const TS = "1700000000";

describe("verifyMpSignature", () => {
  it("acepta firma generada con manifest correcto (id=dataId, NO requestId)", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, sig, SECRET)).toBe(true);
  });

  it("rechaza firma cuando se intercambia dataId por requestId (bug de la skill original)", () => {
    // Si alguien arma el manifest con `id:${requestId}` en vez de `id:${dataId}`,
    // la firma generada es distinta y debe ser rechazada.
    const sigBuggy = signMpManifest(REQUEST_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, sigBuggy, SECRET)).toBe(false);
  });

  it("rechaza firma con dataId distinto al firmado", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature("9999999", REQUEST_ID, sig, SECRET)).toBe(false);
  });

  it("rechaza firma con requestId distinto al firmado", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature(DATA_ID, "req-otro", sig, SECRET)).toBe(false);
  });

  it("rechaza firma con secret incorrecto", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, sig, "secret-falso")).toBe(false);
  });

  it("rechaza firma malformada (sin ts ni v1)", () => {
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, "garbage", SECRET)).toBe(false);
  });

  it("rechaza firma vacía", () => {
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, "", SECRET)).toBe(false);
  });

  it("rechaza dataId vacío", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature("", REQUEST_ID, sig, SECRET)).toBe(false);
  });

  it("rechaza secret vacío", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, sig, "")).toBe(false);
  });

  it("tolera espacios en el header (parseo robusto)", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    const conEspacios = sig.split(",").map((p) => " " + p + " ").join(",");
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, conEspacios, SECRET)).toBe(true);
  });

  it("usa comparación de tiempo constante (timingSafeEqual)", () => {
    // No hay forma de testear el timing exacto, pero la función no debe
    // romperse cuando v1 tiene longitud distinta a la esperada.
    expect(verifyMpSignature(DATA_ID, REQUEST_ID, "ts=1,v1=ABC", SECRET)).toBe(false);
  });
});

describe("signMpManifest", () => {
  it("genera firma determinística (mismo input → mismo output)", () => {
    const a = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    const b = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(a).toBe(b);
  });

  it("incluye ts y v1 en el formato esperado", () => {
    const sig = signMpManifest(DATA_ID, REQUEST_ID, TS, SECRET);
    expect(sig).toMatch(/^ts=\d+,v1=[a-f0-9]{64}$/);
  });

  it("genera firmas distintas para timestamps distintos", () => {
    const a = signMpManifest(DATA_ID, REQUEST_ID, "1000", SECRET);
    const b = signMpManifest(DATA_ID, REQUEST_ID, "2000", SECRET);
    expect(a).not.toBe(b);
  });
});
