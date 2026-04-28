import { describe, it, expect, beforeEach } from "vitest";
import { AfipStubDriver } from "../stub-driver";
import { __resetAfipDriverCache, getAfipDriver } from "../factory";
import {
  COND_IVA_RECEPTOR,
  DOC_TIPO,
  TIPO_COMPROBANTE,
  AfipError,
  type FacturaPayload,
} from "../types";

const validPayload: FacturaPayload = {
  punto_venta: 1,
  tipo_comprobante: TIPO_COMPROBANTE.FACTURA_B,
  doc_tipo: DOC_TIPO.CUIT,
  doc_nro: "20123456786",
  cond_iva_receptor: COND_IVA_RECEPTOR.CONSUMIDOR_FINAL,
  fecha_comprobante: "2026-04-28",
  importe_neto: 100,
  importe_iva: 21,
  importe_total: 121,
  alicuota_iva: 21,
  moneda: "PES",
  concepto: 1,
};

describe("AfipStubDriver", () => {
  let driver: AfipStubDriver;

  beforeEach(() => {
    driver = new AfipStubDriver();
  });

  describe("emitirFactura", () => {
    it("genera CAE de 14 dígitos numéricos", async () => {
      const res = await driver.emitirFactura(validPayload);
      expect(res.cae).toMatch(/^\d{14}$/);
    });

    it("genera fecha de vencimiento 10 días en el futuro", async () => {
      const res = await driver.emitirFactura(validPayload);
      const venc = new Date(res.cae_vencimiento);
      const hoy = new Date();
      const diff = Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBeGreaterThanOrEqual(9);
      expect(diff).toBeLessThanOrEqual(11);
    });

    it("retorna resultado='A' (aprobado) sin observaciones", async () => {
      const res = await driver.emitirFactura(validPayload);
      expect(res.resultado).toBe("A");
      expect(res.observaciones).toEqual([]);
    });

    it("incrementa el numero_comprobante por (puntoVenta, tipo)", async () => {
      const a = await driver.emitirFactura(validPayload);
      const b = await driver.emitirFactura(validPayload);
      expect(b.numero_comprobante).toBe(a.numero_comprobante + 1);
    });

    it("mantiene contadores independientes por punto de venta", async () => {
      const pv1 = await driver.emitirFactura({ ...validPayload, punto_venta: 1 });
      const pv2 = await driver.emitirFactura({ ...validPayload, punto_venta: 2 });
      expect(pv1.numero_comprobante).toBe(1);
      expect(pv2.numero_comprobante).toBe(1);
    });

    it("mantiene contadores independientes por tipo de comprobante", async () => {
      const fb = await driver.emitirFactura({
        ...validPayload,
        tipo_comprobante: TIPO_COMPROBANTE.FACTURA_B,
      });
      const fc = await driver.emitirFactura({
        ...validPayload,
        tipo_comprobante: TIPO_COMPROBANTE.FACTURA_C,
      });
      expect(fb.numero_comprobante).toBe(1);
      expect(fc.numero_comprobante).toBe(1);
    });

    describe("validaciones", () => {
      it("rechaza punto_venta fuera de rango", async () => {
        await expect(
          driver.emitirFactura({ ...validPayload, punto_venta: 0 }),
        ).rejects.toThrow(AfipError);
      });

      it("rechaza importe_total negativo", async () => {
        await expect(
          driver.emitirFactura({ ...validPayload, importe_total: -1 }),
        ).rejects.toThrow(/negativo/);
      });

      it("rechaza si neto+iva no coincide con total (más de 2 centavos)", async () => {
        await expect(
          driver.emitirFactura({
            ...validPayload,
            importe_neto: 100,
            importe_iva: 21,
            importe_total: 200,
          }),
        ).rejects.toThrow(/neto \+ iva/);
      });

      it("tolera diferencias de hasta 2 centavos por redondeo", async () => {
        await expect(
          driver.emitirFactura({
            ...validPayload,
            importe_neto: 100,
            importe_iva: 21,
            importe_total: 121.02,
          }),
        ).resolves.toBeDefined();
      });

      it("rechaza CUIT con menos de 11 dígitos", async () => {
        await expect(
          driver.emitirFactura({ ...validPayload, doc_nro: "20123" }),
        ).rejects.toThrow(/CUIT/);
      });

      it("rechaza moneda DOL sin cotizacion_dolar", async () => {
        await expect(
          driver.emitirFactura({ ...validPayload, moneda: "DOL" }),
        ).rejects.toThrow(/cotizacion_dolar/);
      });
    });
  });

  describe("consultarComprobante", () => {
    it("devuelve null para comprobante inexistente", async () => {
      const res = await driver.consultarComprobante({
        punto_venta: 1,
        tipo_comprobante: TIPO_COMPROBANTE.FACTURA_B,
        numero_comprobante: 999,
      });
      expect(res).toBeNull();
    });

    it("devuelve el payload + CAE original tras emitir", async () => {
      const emitido = await driver.emitirFactura(validPayload);
      const consultado = await driver.consultarComprobante({
        punto_venta: validPayload.punto_venta,
        tipo_comprobante: validPayload.tipo_comprobante,
        numero_comprobante: emitido.numero_comprobante,
      });
      expect(consultado).not.toBeNull();
      expect(consultado!.cae).toBe(emitido.cae);
      expect(consultado!.payload).toEqual(validPayload);
      expect(consultado!.emitido_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("obtenerProximoNumero", () => {
    it("devuelve 1 para combinación nueva", async () => {
      const n = await driver.obtenerProximoNumero(1, TIPO_COMPROBANTE.FACTURA_B);
      expect(n).toBe(1);
    });

    it("no incrementa el contador (es solo preview)", async () => {
      const a = await driver.obtenerProximoNumero(1, TIPO_COMPROBANTE.FACTURA_B);
      const b = await driver.obtenerProximoNumero(1, TIPO_COMPROBANTE.FACTURA_B);
      expect(a).toBe(b);
    });

    it("refleja el siguiente número tras una emisión real", async () => {
      await driver.emitirFactura(validPayload);
      const n = await driver.obtenerProximoNumero(
        validPayload.punto_venta,
        validPayload.tipo_comprobante,
      );
      expect(n).toBe(2);
    });
  });

  describe("driverName", () => {
    it("identifica al driver como 'stub' para auditoría", () => {
      expect(driver.driverName).toBe("stub");
    });
  });
});

describe("getAfipDriver factory", () => {
  beforeEach(() => {
    __resetAfipDriverCache();
    delete process.env.AFIP_DRIVER;
  });

  it("default sin env var → stub", () => {
    expect(getAfipDriver().driverName).toBe("stub");
  });

  it("AFIP_DRIVER=stub → AfipStubDriver", () => {
    process.env.AFIP_DRIVER = "stub";
    expect(getAfipDriver()).toBeInstanceOf(AfipStubDriver);
  });

  it("cachea la misma instancia entre llamadas (preserva estado)", () => {
    const a = getAfipDriver();
    const b = getAfipDriver();
    expect(a).toBe(b);
  });

  it("AFIP_DRIVER=sandbox → throw not implemented", () => {
    process.env.AFIP_DRIVER = "sandbox";
    expect(() => getAfipDriver()).toThrow(/sandbox.*no implementado/);
  });

  it("AFIP_DRIVER=production → throw not implemented", () => {
    process.env.AFIP_DRIVER = "production";
    expect(() => getAfipDriver()).toThrow(/production.*no implementado/);
  });

  it("AFIP_DRIVER inválido → throw con valores válidos", () => {
    process.env.AFIP_DRIVER = "wololo";
    expect(() => getAfipDriver()).toThrow(/wololo|stub.*sandbox.*production/);
  });
});
