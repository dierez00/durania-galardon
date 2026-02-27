"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  MapPin,
  Bug as Cow,
  TestTube,
  Ship,
  Shield,
  ClipboardList,
  FileText,
  Users,
  Truck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import {
  ROLE_DEFAULT_PERMISSIONS,
  isProducerViewRole,
  isTenantAdminRole,
  type AppRole,
  type PermissionKey,
} from "@/shared/lib/auth";

interface NavigationItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission: PermissionKey;
  exact?: boolean;
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
  { name: "Empleados", href: "/producer/empleados", icon: Users, permission: "producer.employees.read" },
];

const mvzNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/mvz/dashboard", icon: LayoutDashboard, permission: "mvz.dashboard.read" },
  { name: "Ranchos", href: "/mvz/ranchos", icon: ClipboardList, permission: "mvz.ranch.read" },
  { name: "Asignaciones (legacy)", href: "/mvz/asignaciones", icon: ClipboardList, permission: "mvz.assignments.read" },
  { name: "Pruebas (legacy)", href: "/mvz/pruebas", icon: TestTube, permission: "mvz.tests.read" },
  { name: "Exportaciones (legacy)", href: "/mvz/exportaciones", icon: Ship, permission: "mvz.exports.read" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
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
    function getBaseNavigation(): NavigationItem[] {
      if (!role) return producerNavigation;
      if (isTenantAdminRole(role)) return adminNavigation;
      if (isProducerViewRole(role)) return producerNavigation;
      return mvzNavigation;
    }
    const baseNavigation = getBaseNavigation();

    if (permissions.length === 0) {
      return baseNavigation;
    }

    return baseNavigation.filter((item) => permissions.includes(item.permission));
  }, [permissions, role]);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-17" : "w-65"
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">SIINIGA</h1>
            <p className="text-[10px] text-sidebar-foreground/50 leading-none">Control Ganadero Estatal</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
