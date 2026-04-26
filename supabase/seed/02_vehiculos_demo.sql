-- ============================================================================
-- SEED — vehículos de demostración para landing y admin
-- ============================================================================

INSERT INTO vehiculos
  (empresa_id, sucursal_id, patente, tipo, condicion, marca, modelo, version, anio, color,
   kilometraje, combustible, transmision, precio_venta, moneda, estado, foto_principal_url, equipamiento)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'AC123BD', 'auto', '0km', 'Toyota', 'Corolla', 'XEi 2.0 CVT', 2026, 'Blanco perla',
   0, 'Nafta', 'CVT', 28500000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1623869675781-80aa31012c78?w=800',
   '["AA","Cierre centralizado","Bluetooth","Cámara de retroceso","6 airbags"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
   'AB456CD', '4x4', 'usado', 'Toyota', 'Hilux', 'SRX 4x4 AT', 2023, 'Gris oscuro',
   45000, 'Diesel', 'Automática', 42000000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800',
   '["4x4","Cuero","Climatizador","GPS","Llantas 18"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'AD789EF', 'camioneta', '0km', 'Volkswagen', 'Amarok', 'V6 Highline', 2026, 'Negro',
   0, 'Diesel', 'Automática', 58900000, 'ARS', 'reservado',
   'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800',
   '["V6","Cuero","Techo Corredizo","Sensores 360"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'AG321HI', 'auto', 'usado', 'Ford', 'Focus', 'Titanium 2.0', 2021, 'Rojo',
   62000, 'Nafta', 'Automática', 18500000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800',
   '["Cuero","Sunroof","Sensores","Llantas 17"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'AH654JK', 'moto', '0km', 'Honda', 'CB 500F', 'Standard', 2026, 'Roja',
   0, 'Nafta', 'Manual', 9800000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
   '["ABS","LED","Tablero digital"]'::jsonb),

  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'AI987LM', 'utilitario', 'usado', 'Renault', 'Kangoo', 'Express', 2022, 'Blanco',
   38000, 'Diesel', 'Manual', 15700000, 'ARS', 'stock',
   'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
   '["AA","Radio","ABS"]'::jsonb);
