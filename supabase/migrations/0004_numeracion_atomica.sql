-- ============================================================================
-- 0004 — Numeración correlativa atómica (CORRECCIÓN CRÍTICA)
-- ============================================================================
-- Reemplaza el SELECT COUNT(*) original (race condition + lento).
-- Patrón: UPSERT con RETURNING garantiza que dos transacciones concurrentes
-- nunca obtengan el mismo número.
-- ============================================================================

CREATE TABLE numeracion_correlativos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL,        -- 'venta', 'inversion', 'liquidacion'
  codigo_sucursal VARCHAR(10) NOT NULL,
  anio            INT NOT NULL,
  ultimo_numero   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uniq_numeracion UNIQUE (empresa_id, tipo, codigo_sucursal, anio)
);

-- Función atómica de numeración. Devuelve el número formateado.
CREATE OR REPLACE FUNCTION generar_numero_operacion(
  p_empresa_id      UUID,
  p_tipo            VARCHAR,
  p_codigo_sucursal VARCHAR
) RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio   INT := EXTRACT(YEAR FROM NOW());
  v_numero INT;
BEGIN
  INSERT INTO numeracion_correlativos
    (empresa_id, tipo, codigo_sucursal, anio, ultimo_numero)
  VALUES
    (p_empresa_id, p_tipo, p_codigo_sucursal, v_anio, 1)
  ON CONFLICT (empresa_id, tipo, codigo_sucursal, anio)
  DO UPDATE SET
    ultimo_numero = numeracion_correlativos.ultimo_numero + 1,
    updated_at    = NOW()
  RETURNING ultimo_numero INTO v_numero;

  RETURN 'SVI-' || p_codigo_sucursal || '-' || v_anio::TEXT || '-' || LPAD(v_numero::TEXT, 5, '0');
END;
$$;

-- ============================================
-- WEBHOOKS — idempotencia obligatoria
-- ============================================
CREATE TABLE webhook_eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor     VARCHAR(30) NOT NULL,         -- 'mercadopago', 'afip', 'n8n', 'resend'
  external_id   VARCHAR(100) NOT NULL,         -- ID único del proveedor
  payload       JSONB NOT NULL,
  procesado     BOOLEAN NOT NULL DEFAULT FALSE,
  error         TEXT,
  intentos      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  procesado_at  TIMESTAMPTZ,
  CONSTRAINT uniq_webhook UNIQUE (proveedor, external_id)
);

CREATE INDEX idx_webhook_procesado ON webhook_eventos(procesado) WHERE procesado = FALSE;

-- ============================================
-- AUDIT LOG (financiero)
-- ============================================
CREATE TABLE audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID,
  tabla            VARCHAR(100) NOT NULL,
  operacion        VARCHAR(10) NOT NULL,         -- 'INSERT', 'UPDATE', 'DELETE'
  registro_id      UUID NOT NULL,
  usuario_id       UUID,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  ip_address       INET,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_empresa_tabla ON audit_log(empresa_id, tabla, created_at DESC);
CREATE INDEX idx_audit_registro ON audit_log(tabla, registro_id);

-- Función reusable: trigger genérico de auditoría
CREATE OR REPLACE FUNCTION trg_audit_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_old JSONB := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_old_upd JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
  v_empresa_id UUID;
  v_registro_id UUID;
BEGIN
  -- empresa_id se obtiene de la fila si existe
  IF v_new IS NOT NULL THEN
    v_empresa_id := (v_new->>'empresa_id')::uuid;
    v_registro_id := (v_new->>'id')::uuid;
  ELSE
    v_empresa_id := (v_old->>'empresa_id')::uuid;
    v_registro_id := (v_old->>'id')::uuid;
  END IF;

  INSERT INTO audit_log
    (empresa_id, tabla, operacion, registro_id, usuario_id,
     datos_anteriores, datos_nuevos)
  VALUES
    (v_empresa_id, TG_TABLE_NAME, TG_OP, v_registro_id, auth.uid(),
     COALESCE(v_old, v_old_upd), v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;
