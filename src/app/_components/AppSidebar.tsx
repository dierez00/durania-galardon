"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Shield,
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
  ROLE_DEFAULT_PERMISSIONS,
  isProducerViewRole,
  isTenantAdminRole,
  type AppRole,
  type PermissionKey,
} from "@/shared/lib/auth";
import { SidebarShell, type SidebarNavigationItem } from "@/shared/ui/layout/SidebarShell";

interface NavigationItem extends SidebarNavigationItem {
  permission: PermissionKey;
}

const adminNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: "admin.dashboard.read", exact: true },
  { name: "Productores", href: "/admin/producers", icon: Users, permission: "admin.producers.read" },
  { name: "MVZ", href: "/admin/mvz", icon: Stethoscope, permission: "admin.mvz.read" },
  { name: "Cuarentenas", href: "/admin/quarantines", icon: Shield, permission: "admin.quarantines.read" },
  { name: "Exportaciones", href: "/admin/exports", icon: Ship, permission: "admin.exports.read" },
  { name: "Normativa", href: "/admin/normative", icon: ClipboardList, permission: "admin.normative.read" },
  { name: "Auditoria", href: "/admin/audit", icon: FileText, permission: "admin.audit.read" },
  { name: "Citas", href: "/admin/appointments", icon: CalendarDays, permission: "admin.appointments.read" },
];

const producerNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/producer/dashboard", icon: LayoutDashboard, permission: "producer.dashboard.read" },
  { name: "Ranchos", href: "/producer/ranchos", icon: MapPin, permission: "producer.upp.read" },
  { name: "Bovinos", href: "/producer/bovinos", icon: Cow, permission: "producer.bovinos.read" },
  { name: "Movilizacion", href: "/producer/movilizacion", icon: Truck, permission: "producer.movements.read" },
  { name: "Exportaciones", href: "/producer/exportaciones", icon: Ship, permission: "producer.exports.read" },
  { name: "Documentos", href: "/producer/documentos", icon: FileText, permission: "producer.documents.read" },
  { name: "Equipo", href: "/producer/empleados", icon: Users, permission: "producer.employees.read" },
];

const mvzNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/mvz/dashboard", icon: LayoutDashboard, permission: "mvz.dashboard.read" },
  { name: "Ranchos", href: "/mvz/ranchos", icon: ClipboardList, permission: "mvz.ranch.read" },
  { name: "Asignaciones (legacy)", href: "/mvz/asignaciones", icon: ClipboardList, permission: "mvz.assignments.read" },
  { name: "Pruebas (legacy)", href: "/mvz/pruebas", icon: TestTube, permission: "mvz.tests.read" },
  { name: "Exportaciones (legacy)", href: "/mvz/exportaciones", icon: Ship, permission: "mvz.exports.read" },
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

    return baseNavigation.filter((item) => permissions.includes(item.permission));
  }, [permissions, role]);

  return (
    <SidebarShell
      navigation={navigation}
      brandIcon={Shield}
      brandTitle="SIINIGA"
      brandSubtitle="Control Ganadero Estatal"
    />
  );
}
