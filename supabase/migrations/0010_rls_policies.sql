-- ============================================================================
-- 0010 — Row Level Security (RLS) — patrón JWT claims (§8.3 corregido)
-- ============================================================================
-- Las políticas leen empresa_id, rol y sucursales[] del JWT inyectado por
-- custom_access_token_hook. Cero subqueries → performance ×10.
-- ============================================================================

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS OPERATIVAS
-- ============================================
ALTER TABLE empresas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_sucursal_rol      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculo_precio_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE traslados                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversion_tasa_historial  ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_inversion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE numeracion_correlativos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_eventos           ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS GENÉRICAS: aislamiento por empresa
-- ============================================
-- Patrón macro: cada tabla con empresa_id usa la misma política.
-- Para no repetir 50 políticas iguales, definimos por tabla.
-- ============================================

-- Empresas: solo el SUPER_ADMIN puede ver todas; el resto solo la suya.
CREATE POLICY "empresas_select" ON empresas
  FOR SELECT USING (
    auth.rol() = 'super_admin'
    OR id = auth.empresa_id()
  );

-- Sucursales
CREATE POLICY "sucursales_select" ON sucursales
  FOR SELECT USING (empresa_id = auth.empresa_id());
CREATE POLICY "sucursales_admin_all" ON sucursales
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Roles
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (empresa_id = auth.empresa_id());
CREATE POLICY "roles_admin_all" ON roles
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Usuarios
CREATE POLICY "usuarios_self" ON usuarios
  FOR SELECT USING (id = auth.uid() OR empresa_id = auth.empresa_id());
CREATE POLICY "usuarios_admin_all" ON usuarios
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

CREATE POLICY "usr_select" ON usuario_sucursal_rol
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR auth.es_admin()
  );

-- Clientes
CREATE POLICY "clientes_empresa" ON clientes
  FOR SELECT USING (empresa_id = auth.empresa_id() AND deleted_at IS NULL);
CREATE POLICY "clientes_write" ON clientes
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());
-- Portal: cliente solo se ve a sí mismo
CREATE POLICY "clientes_portal_self" ON clientes
  FOR SELECT USING (portal_user_id = auth.uid());

-- Leads
CREATE POLICY "leads_empresa" ON leads
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Vehículos: aislamiento por empresa + filtro por sucursales asignadas
CREATE POLICY "vehiculos_empresa_y_sucursal" ON vehiculos
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (
      auth.es_admin()                              -- admin/super_admin ven todas
      OR sucursal_id = ANY(auth.sucursales())     -- el resto solo sus sucursales
    )
  );
CREATE POLICY "vehiculos_write" ON vehiculos
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());

CREATE POLICY "vehiculo_precio_hist_empresa" ON vehiculo_precio_historial
  FOR SELECT USING (empresa_id = auth.empresa_id());

CREATE POLICY "traslados_empresa" ON traslados
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Inversores (sensible)
CREATE POLICY "inversores_empresa" ON inversores
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "inversores_write" ON inversores
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());
-- Portal del inversor: solo se ve a sí mismo
CREATE POLICY "inversores_portal_self" ON inversores
  FOR SELECT USING (portal_user_id = auth.uid());

-- Inversiones
CREATE POLICY "inversiones_empresa" ON inversiones
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "inversiones_write" ON inversiones
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());
CREATE POLICY "inversiones_portal_self" ON inversiones
  FOR SELECT USING (
    inversor_id IN (SELECT id FROM inversores WHERE portal_user_id = auth.uid())
  );

-- Liquidaciones: misma lógica
CREATE POLICY "liquidaciones_empresa" ON liquidaciones_inversion
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente')
  );
CREATE POLICY "liquidaciones_portal_self" ON liquidaciones_inversion
  FOR SELECT USING (
    inversion_id IN (
      SELECT inv.id FROM inversiones inv
      JOIN inversores i ON i.id = inv.inversor_id
      WHERE i.portal_user_id = auth.uid()
    )
  );
CREATE POLICY "liquidaciones_write" ON liquidaciones_inversion
  FOR ALL USING (auth.es_admin() AND empresa_id = auth.empresa_id());

CREATE POLICY "tasa_hist_empresa" ON inversion_tasa_historial
  FOR SELECT USING (empresa_id = auth.empresa_id() AND auth.es_admin());

-- Bancos
CREATE POLICY "bancos_empresa" ON bancos
  FOR ALL USING (empresa_id = auth.empresa_id());

-- Ventas
CREATE POLICY "ventas_empresa_y_sucursal" ON ventas
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "ventas_write" ON ventas
  FOR ALL USING (empresa_id = auth.empresa_id())
  WITH CHECK (empresa_id = auth.empresa_id());
-- Portal cliente: solo sus propias ventas
CREATE POLICY "ventas_portal_self" ON ventas
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE portal_user_id = auth.uid())
  );

-- Caja
CREATE POLICY "mov_caja_empresa_y_sucursal" ON movimientos_caja
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND deleted_at IS NULL
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "mov_caja_write" ON movimientos_caja
  FOR ALL USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente', 'caja')
  );

CREATE POLICY "cierres_caja_empresa" ON cierres_caja
  FOR SELECT USING (
    empresa_id = auth.empresa_id()
    AND (auth.es_admin() OR sucursal_id = ANY(auth.sucursales()))
  );
CREATE POLICY "cierres_caja_write" ON cierres_caja
  FOR ALL USING (
    empresa_id = auth.empresa_id()
    AND auth.rol() IN ('super_admin', 'admin', 'gerente', 'caja')
  );

-- Audit log: solo admin/super_admin lee
CREATE POLICY "audit_admin" ON audit_log
  FOR SELECT USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Numeración correlativos: solo lectura para admin (no debería editarse a mano)
CREATE POLICY "numeracion_admin" ON numeracion_correlativos
  FOR SELECT USING (auth.es_admin() AND empresa_id = auth.empresa_id());

-- Webhook eventos: solo service role accede (RLS bloquea todo lo demás)
-- (No hay política de SELECT/INSERT pública → tabla cerrada salvo service_role bypass)
