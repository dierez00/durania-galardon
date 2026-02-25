"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MapPin,
  Bug as Cow,
  TestTube,
  ShieldAlert,
  Ship,
  BookOpen,
  Shield,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Usuarios", href: "/usuarios", icon: Users },
  { name: "Productores", href: "/productores", icon: UserCheck },
  { name: "Ranchos", href: "/ranchos", icon: MapPin },
  { name: "Bovinos", href: "/bovinos", icon: Cow },
  { name: "Pruebas Sanitarias", href: "/pruebas", icon: TestTube },
  { name: "Cuarentenas", href: "/cuarentenas", icon: ShieldAlert },
  { name: "Exportaciones", href: "/exportaciones", icon: Ship },
  { name: "Catalogos", href: "/catalogos", icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">
              SIINIGA
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 leading-none">
              Control Ganadero Estatal
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
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


    </aside>
  );
}
