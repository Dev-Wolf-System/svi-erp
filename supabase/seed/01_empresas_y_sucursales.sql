-- ============================================================================
-- SEED — datos iniciales para desarrollo local
-- ============================================================================
-- NO correr en producción. Diseñado para `supabase db reset` local.
-- ============================================================================

INSERT INTO empresas (id, nombre, razon_social, cuit, config) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Solo Vehículos Impecables',
    'SVI S.A.',
    '30-71234567-8',
    jsonb_build_object(
      'modulos_activos', ARRAY['stock', 'ventas', 'clientes', 'inversiones', 'caja', 'reportes'],
      'moneda_default', 'ARS',
      'monedas_aceptadas', ARRAY['ARS', 'USD'],
      'tasa_fci_default', 5.0,
      'dias_reserva_default', 7,
      'afip_driver', 'stub',
      'branding', jsonb_build_object(
        'primary_color', '#C8102E',
        'secondary_color', '#C5A059'
      )
    )
  );

INSERT INTO sucursales (id, empresa_id, nombre, codigo, direccion, telefono, tiene_caja) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Aguilares', 'AGU', 'Av. Sarmiento 100, Aguilares, Tucumán', '+54 9 3865 555-0001', true
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Concepción', 'CON', 'Av. Mitre 500, Concepción, Tucumán', '+54 9 3865 555-0002', true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'San Miguel de Tucumán', 'TUC', 'Av. Mate de Luna 1500, S.M. de Tucumán', '+54 9 3815 555-0003', true
  );

-- Roles base
INSERT INTO roles (id, empresa_id, nombre, permisos) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'super_admin', '["*"]'::jsonb),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'admin', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'gerente', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'vendedor', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'caja', '[]'::jsonb),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'secretaria', '[]'::jsonb);
