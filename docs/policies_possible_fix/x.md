La cadena IAM está completa. Hay que ir directo a la red — el problema está en algún punto del runtime, no en la BD. Déjame leer el código de permisos que aún no he visto:

Encontré el problema. La función requirePermission llama a auth_has_tenant_permission vía RPC. Vamos a ver esa función:

La función SQL está bien. El problema podría ser que el accessToken del cliente no se envía correctamente. Déjame leer getAccessToken:

Déjame ver el middleware — es quien inyecta el x-tenant-slug-resolved que el servidor usa para resolver el contexto:

DEFAULT_TENANT_SLUG

no está configurado — el middleware usa 'default-tenant' como fallback. Ahora déjame leer el hook y ver la lógica del estado:

Encuentro el problema real. Hay dos síntomas que apuntan al mismo lugar:

La cadena IAM está completa en DB ✅
Pero el hook NO muestra error visible — solo lista vacía
Esto pasa cuando resolveAccessibleUppIds hace su primera query RLS en upps, recibe un error de recursión infinita de PostgreSQL, y retorna [] silenciosamente antes de llegar a la lógica del productor.

Verifica primero si el fix fue aplicado:

-- ¿Existen las funciones helper anti-recursión?
SELECT proname
FROM pg_proc
WHERE proname IN ('auth_is_government_member', 'auth_is_government_admin');

-- ¿Qué dice la política actual de "upps: gobierno ve todas"?
SELECT polname, pg_get_expr(polqual, polrelid) AS policy_body
FROM pg_policy
JOIN pg_class ON pg_class.oid = pg_policy.polrelid
WHERE pg_class.relname = 'upps';

Si auth_is_government_member no aparece, o la política de upps contiene JOIN tenants (no auth_is_government_member()), el fix_rls_infinite_recursion.sql no fue aplicado. Aplícalo completo en el SQL Editor de Supabase:

-- ============================================================
-- PASO 1: Funciones SECURITY DEFINER (escapan del bucle RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auth_is_government_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
      AND tm.status  = 'active'
      AND t.type     = 'government'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_government_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships tm
    JOIN public.tenants             t   ON t.id  = tm.tenant_id
    JOIN public.tenant_user_roles   tur ON tur.membership_id = tm.id
    JOIN public.tenant_roles        tr  ON tr.id = tur.tenant_role_id
    WHERE tm.user_id = auth.uid()
      AND tm.status  = 'active'
      AND t.type     = 'government'
      AND tr.key     = 'tenant_admin'
  );
$$;

-- ============================================================
-- PASO 2: Reparar política recursiva en tenants
-- ============================================================
DROP POLICY IF EXISTS "tenants: gobierno gestiona" ON public.tenants;
CREATE POLICY "tenants: gobierno gestiona"
  ON public.tenants FOR ALL
  USING (public.auth_is_government_admin());

-- ============================================================
-- PASO 3: Reparar política recursiva en upps  ← causa inmediata
-- ============================================================
DROP POLICY IF EXISTS "upps: gobierno ve todas" ON public.upps;
CREATE POLICY "upps: gobierno ve todas"
  ON public.upps FOR SELECT
  USING (public.auth_is_government_member());

-- ============================================================
-- PASO 4: Reparar políticas en producers (también afectadas)
-- ============================================================
DROP POLICY IF EXISTS "producers: gobierno ve todos" ON public.producers;
CREATE POLICY "producers: gobierno ve todos"
  ON public.producers FOR SELECT
  USING (public.auth_is_government_member());

DROP POLICY IF EXISTS "producers: gobierno gestiona" ON public.producers;
CREATE POLICY "producers: gobierno gestiona"
  ON public.producers FOR ALL
  USING (public.auth_is_government_admin());

Después de aplicarlo, recarga la página — las UPPs deben aparecer.

Por qué fallaba silenciosamente: resolveAccessibleUppIds tiene esta guardia al inicio:

const uppResult = await supabase.from("upps").select("id");
if (uppResult.error) {   // ← captura el error de recursión
  return [];             // ← devuelve vacío sin lanzar excepción
}

El error de PostgreSQL infinite recursion detected in policy for relation "tenants" quedaba atrapado aquí, la ruta respondía { upps: [] }, y el frontend mostraba tabla vacía sin mensaje de error.

Claude Sonnet 4.6 • 1x
Scope excluido
Geocercas / GPS offline (requiere PWA nativa, fuera del alcance web)
Flujo completo de emission QR REEMO (en módulo movilizacion)
Bloqueo automático de reactor offline (backend event, sin frontend adicional necesario)
Módulo 4 (Exportación/Arete Azul) — scope separado
¿Este plan está bien? ¿Quieres ajustar algo antes de proceder con la implementación?

