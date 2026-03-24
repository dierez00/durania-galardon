-- ─────────────────────────────────────────
-- 1. TABLA DE COLLARES
-- ─────────────────────────────────────────

CREATE TABLE public.collars (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id         uuid,                          -- NULL hasta que se venda/vincule
  animal_id         uuid,                          -- NULL hasta que se vincule a una vaca
  collar_id         text        NOT NULL UNIQUE,   -- ID físico grabado en firmware ("C34")
  status            text        NOT NULL DEFAULT 'inactive'
                    CHECK (status = ANY (ARRAY[
                      'inactive',    -- recién fabricado, sin asignar
                      'active',      -- asignado a productor y en uso
                      'linked',      -- vinculado a un animal específico
                      'unlinked',    -- desvinculado del animal pero sigue en productor
                      'suspended',   -- bloqueado por admin
                      'retired'      -- fuera de servicio
                    ])),
  firmware_version  text,
  purchased_at      timestamptz,                   -- cuando el productor lo compra/activa
  linked_at         timestamptz,                   -- cuando se vincula a un animal
  unlinked_at       timestamptz,                   -- última vez que se desvinculó
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collars_pkey PRIMARY KEY (id),
  CONSTRAINT collars_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT collars_animal_id_fkey
    FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE SET NULL
);

CREATE INDEX idx_collars_collar_id   ON public.collars (collar_id);
CREATE INDEX idx_collars_tenant_id   ON public.collars (tenant_id);
CREATE INDEX idx_collars_animal_id   ON public.collars (animal_id);
CREATE INDEX idx_collars_status      ON public.collars (status);

-- ─────────────────────────────────────────
-- 2. HISTORIAL DE VÍNCULOS COLLAR ↔ ANIMAL
--    (auditoría completa de quién vinculó/desvinculó y cuándo)
-- ─────────────────────────────────────────

CREATE TABLE public.collar_animal_history (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  collar_id_fk    uuid        NOT NULL,            -- FK al uuid del collar
  animal_id       uuid        NOT NULL,
  tenant_id       uuid        NOT NULL,
  linked_by       uuid,                            -- profile que hizo el vínculo
  unlinked_by     uuid,                            -- profile que deshizo el vínculo
  linked_at       timestamptz NOT NULL DEFAULT now(),
  unlinked_at     timestamptz,                     -- NULL si sigue vinculado
  notes           text,

  CONSTRAINT collar_animal_history_pkey PRIMARY KEY (id),
  CONSTRAINT cah_collar_fkey
    FOREIGN KEY (collar_id_fk)  REFERENCES public.collars(id)  ON DELETE CASCADE,
  CONSTRAINT cah_animal_fkey
    FOREIGN KEY (animal_id)     REFERENCES public.animals(id)  ON DELETE CASCADE,
  CONSTRAINT cah_tenant_fkey
    FOREIGN KEY (tenant_id)     REFERENCES public.tenants(id)  ON DELETE CASCADE,
  CONSTRAINT cah_linked_by_fkey
    FOREIGN KEY (linked_by)     REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT cah_unlinked_by_fkey
    FOREIGN KEY (unlinked_by)   REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_cah_collar   ON public.collar_animal_history (collar_id_fk);
CREATE INDEX idx_cah_animal   ON public.collar_animal_history (animal_id);
CREATE INDEX idx_cah_linked   ON public.collar_animal_history (linked_at DESC);

-- ─────────────────────────────────────────
-- 3. TABLA DE TELEMETRÍA
--    Referencia al uuid del collar, no al collar_id texto
-- ─────────────────────────────────────────

CREATE TABLE public.telemetry (
  id              bigserial       PRIMARY KEY,
  collar_uuid     uuid            NOT NULL,        -- FK al collar registrado
  collar_id       text            NOT NULL,        -- copia del ID físico para queries rápidas
  tenant_id       uuid,                            -- denormalizado para RLS fácil
  animal_id       uuid,                            -- denormalizado del vínculo activo al momento del TX
  latitude        double precision,
  longitude       double precision,
  altitude        double precision,
  speed           double precision,
  temperature     double precision,
  activity        integer,
  bat_voltage     double precision,
  bat_percent     integer,
  accel_x         double precision,
  accel_y         double precision,
  accel_z         double precision,
  gyro_x          double precision,
  gyro_y          double precision,
  gyro_z          double precision,
  rssi            integer,                         -- señal LoRa recibida en Raspberry
  snr             double precision,                -- ruido LoRa
  timestamp       timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT telemetry_collar_fkey
    FOREIGN KEY (collar_uuid) REFERENCES public.collars(id) ON DELETE RESTRICT,
  CONSTRAINT telemetry_tenant_fkey
    FOREIGN KEY (tenant_id)   REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT telemetry_animal_fkey
    FOREIGN KEY (animal_id)   REFERENCES public.animals(id) ON DELETE SET NULL
);

CREATE INDEX idx_telemetry_collar_uuid ON public.telemetry (collar_uuid);
CREATE INDEX idx_telemetry_collar_id   ON public.telemetry (collar_id);
CREATE INDEX idx_telemetry_animal_id   ON public.telemetry (animal_id);
CREATE INDEX idx_telemetry_tenant_id   ON public.telemetry (tenant_id);
CREATE INDEX idx_telemetry_timestamp   ON public.telemetry (timestamp DESC);



-- 1. Habilitar RLS en las tres tablas
ALTER TABLE public.collars               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collar_animal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry             ENABLE ROW LEVEL SECURITY;

-- 2. Permisos base al rol anon y authenticated (igual que tus tablas existentes)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.collars               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.collar_animal_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.telemetry             TO authenticated;

-- Solo lectura para anon si lo necesitas
GRANT SELECT ON public.collars    TO anon;
GRANT SELECT ON public.telemetry  TO anon;

-- 3. Permiso sobre la secuencia de telemetry (bigserial)
GRANT USAGE, SELECT ON SEQUENCE public.telemetry_id_seq TO authenticated;

-- 4. Políticas RLS básicas (ajusta según tu lógica de negocio)

-- collars: el productor solo ve sus collares
CREATE POLICY "tenant ve sus collares"
  ON public.collars FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- collar_animal_history: igual por tenant
CREATE POLICY "tenant ve su historial de collares"
  ON public.collar_animal_history FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- telemetry: el productor solo ve telemetría de sus collares
CREATE POLICY "tenant ve su telemetria"
  ON public.telemetry FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ));