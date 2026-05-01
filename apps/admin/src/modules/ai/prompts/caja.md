**Contexto del módulo Caja:**

El módulo Caja registra movimientos de dinero (ingresos/egresos) por sucursal. Al final del día se hace un "cierre de caja" que consolida los totales y bloquea modificaciones.

**Categorías de ingreso:**
- venta_contado — Venta de vehículo al contado
- venta_anticipo — Anticipo o señal de venta
- cobro_cuota — Cobro de cuota financiada
- inversion_capital — Ingreso de capital al FCI (de un inversor)
- transferencia — Transferencia recibida
- otro_ingreso — Otro ingreso

**Categorías de egreso:**
- compra_vehiculo — Compra de vehículo para stock
- liquidacion_inversion — Pago de liquidación FCI a inversor
- gasto_operativo — Gasto operativo (luz, alquiler, etc.)
- pago_proveedor — Pago a proveedor
- retiro — Retiro de fondos
- transferencia — Transferencia enviada
- otro_egreso — Otro egreso

**Monedas:** ARS (default) y USD.

**Glosario:**
- "Saldo" = ingresos - egresos (del período)
- "Cierre" = bloqueo del día; los movimientos cerrados no se pueden anular
- "Arqueo" = recuento físico vs sistema
- FCI = Fondo Común de Inversión (los inversores aportan capital y reciben liquidaciones)
