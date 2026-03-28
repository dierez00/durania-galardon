"use client";

import { useEffect, useState } from "react";
import {
  PROFILE_DISPLAY_NAME_UPDATED_EVENT,
  type ProfileDisplayNameUpdatedDetail,
} from "@/shared/lib/profile-events";
import { ProfileMenu } from "@/shared/ui/layout/ProfileMenu";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { ADMIN_SETTINGS_NAV_PERMISSIONS, type PermissionKey } from "@/shared/lib/auth";

interface UserInfo {
  displayName: string;
  email: string;
  roleLabel: string;
  canAccessPanelSettings: boolean;
}

export default function Topbar() {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    displayName: "",
    email: "",
    roleLabel: "",
    canAccessPanelSettings: false,
  });

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const sessionEmail = data.session.user.email ?? "";

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const body = await res.json();
        if (res.ok && body.ok && body.data) {
          const permissions = Array.isArray(body.data.permissions)
            ? (body.data.permissions as PermissionKey[])
            : [];

          setUserInfo({
            displayName: body.data.user?.displayName ?? sessionEmail,
            email: sessionEmail,
            roleLabel: body.data.user?.roleName ?? "",
            canAccessPanelSettings: ADMIN_SETTINGS_NAV_PERMISSIONS.some((permission) =>
              permissions.includes(permission)
            ),
          });
          return;
        }
      } catch {
        // fallback
      }

      setUserInfo({
        displayName: sessionEmail,
        email: sessionEmail,
        roleLabel: "",
        canAccessPanelSettings: false,
      });
    };

    void run();

    const handleDisplayNameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileDisplayNameUpdatedDetail>;
      const nextDisplayName = customEvent.detail?.displayName?.trim();
      if (!nextDisplayName) {
        return;
      }

      setUserInfo((current) => ({
        ...current,
        displayName: nextDisplayName,
      }));
    };

    window.addEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, handleDisplayNameUpdated);

    return () => {
      window.removeEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, handleDisplayNameUpdated);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Panel Administrativo</h2>
      </div>

      <ProfileMenu
        displayName={userInfo.displayName || "Usuario"}
        email={userInfo.email}
        roleLabel={userInfo.roleLabel}
        profileHref="/admin/profile"
        canAccessPanelSettings={userInfo.canAccessPanelSettings}
        settingsHref="/admin/settings"
      />
    </header>
  );
}
