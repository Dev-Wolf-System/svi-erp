-- ============================================================================
-- 0002 — Tablas core: empresas, sucursales, roles, usuarios, RBAC
-- ============================================================================

-- ============================================
-- EMPRESAS (raíz multi-tenancy)
-- ============================================
CREATE TABLE empresas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(100) NOT NULL,
  razon_social  VARCHAR(200),
  cuit          VARCHAR(13),
  logo_url      TEXT,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SUCURSALES
-- ============================================
CREATE TABLE sucursales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(100) NOT NULL,
  codigo        VARCHAR(10) NOT NULL,                  -- "AGU", "CON", "TUC"
  direccion     TEXT,
  telefono      VARCHAR(20),
  email         VARCHAR(100),
  tiene_caja    BOOLEAN NOT NULL DEFAULT TRUE,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE(empresa_id, codigo)
);

-- ============================================
-- ROLES y USUARIOS
-- ============================================
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(50) NOT NULL,
  permisos      JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(empresa_id, nombre)
);

CREATE TABLE usuarios (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  telefono      VARCHAR(20),
  avatar_url    TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Tabla puente: un usuario puede tener distintos roles en distintas sucursales
CREATE TABLE usuario_sucursal_rol (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sucursal_id   UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
  rol_id        UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, sucursal_id)
);

CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usr_usuario ON usuario_sucursal_rol(usuario_id);
CREATE INDEX idx_usr_sucursal ON usuario_sucursal_rol(sucursal_id);
