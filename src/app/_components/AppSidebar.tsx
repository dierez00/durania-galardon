"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Shield,
  ShieldCheck,
  Ship,
  Stethoscope,
  TestTube,
  Truck,
  Users,
  Bug as Cow,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import {
  ADMIN_SETTINGS_NAV_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  hasAnyPermission,
  isProducerViewRole,
  isTenantAdminRole,
  type AppRole,
  type PermissionKey,
} from "@/shared/lib/auth";
import { SidebarShell, type SidebarNavigationItem } from "@/shared/ui/layout/SidebarShell";

interface NavigationItem extends SidebarNavigationItem {
  permissions?: PermissionKey[];
  anyPermissions?: PermissionKey[];
}

const adminNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, permissions: ["admin.dashboard.read"], exact: true },
  { name: "Productores", href: "/admin/producers", icon: Users, permissions: ["admin.producers.read"] },
  { name: "MVZ", href: "/admin/mvz", icon: Stethoscope, permissions: ["admin.mvz.read"] },
  { name: "Cuarentenas", href: "/admin/quarantines", icon: Shield, permissions: ["admin.quarantines.read"] },
  { name: "Exportaciones", href: "/admin/exports", icon: Ship, permissions: ["admin.exports.read"] },
  {
    name: "Configuracion",
    href: "/admin/settings",
    icon: ShieldCheck,
    anyPermissions: ADMIN_SETTINGS_NAV_PERMISSIONS,
  },
  { name: "Citas", href: "/admin/appointments", icon: CalendarDays, permissions: ["admin.appointments.read"] },
];

const producerNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/producer/dashboard", icon: LayoutDashboard, permissions: ["producer.dashboard.read"] },
  { name: "Ranchos", href: "/producer/ranchos", icon: MapPin, permissions: ["producer.upp.read"] },
  { name: "Bovinos", href: "/producer/bovinos", icon: Cow, permissions: ["producer.bovinos.read"] },
  { name: "Movilizacion", href: "/producer/movilizacion", icon: Truck, permissions: ["producer.movements.read"] },
  { name: "Exportaciones", href: "/producer/exportaciones", icon: Ship, permissions: ["producer.exports.read"] },
  { name: "Documentos", href: "/producer/documentos", icon: ClipboardList, permissions: ["producer.documents.read"] },
  { name: "Equipo", href: "/producer/empleados", icon: Users, permissions: ["producer.employees.read"] },
];

const mvzNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/mvz/dashboard", icon: LayoutDashboard, permissions: ["mvz.dashboard.read"] },
  { name: "Ranchos", href: "/mvz/ranchos", icon: ClipboardList, permissions: ["mvz.ranch.read"] },
  { name: "Asignaciones (legacy)", href: "/mvz/asignaciones", icon: ClipboardList, permissions: ["mvz.assignments.read"] },
  { name: "Pruebas (legacy)", href: "/mvz/pruebas", icon: TestTube, permissions: ["mvz.tests.read"] },
  { name: "Exportaciones (legacy)", href: "/mvz/exportaciones", icon: Ship, permissions: ["mvz.exports.read"] },
];

export default function AppSidebar() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        return;
      }

      const roleResult = await resolveClientRole(supabase, data.session.user.id);
      if (!roleResult.role) {
        return;
      }

      setRole(roleResult.role);

      try {
        const authMeResponse = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const authMeBody = await authMeResponse.json();
        if (authMeResponse.ok && authMeBody.ok && Array.isArray(authMeBody.data?.permissions)) {
          setPermissions(authMeBody.data.permissions as PermissionKey[]);
          return;
        }
      } catch {
        // Ignore and use fallback role permissions.
      }

      setPermissions(ROLE_DEFAULT_PERMISSIONS[roleResult.role] ?? []);
    };

    void run();
  }, []);

  const navigation = useMemo(() => {
    const baseNavigation = !role
      ? producerNavigation
      : isTenantAdminRole(role)
        ? adminNavigation
        : isProducerViewRole(role)
          ? producerNavigation
          : mvzNavigation;

    if (permissions.length === 0) {
      return baseNavigation;
    }

    return baseNavigation.filter((item) => {
      if (item.permissions?.length) {
        return item.permissions.every((permission) => permissions.includes(permission));
      }

      if (item.anyPermissions?.length) {
        return hasAnyPermission(permissions, item.anyPermissions);
      }

      return true;
    });
  }, [permissions, role]);

  return (
    <SidebarShell
      navigation={navigation}
      brandTitle="O.C.H.O.A"
      brandSubtitle="Control Ganadero Estatal"
    />
  );
}
