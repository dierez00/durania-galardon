export const PROFILE_DISPLAY_NAME_UPDATED_EVENT = "workspace:profile-display-name-updated";

export interface ProfileDisplayNameUpdatedDetail {
  displayName: string;
}

export function dispatchProfileDisplayNameUpdated(displayName: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedDisplayName = displayName.trim();
  if (!normalizedDisplayName) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ProfileDisplayNameUpdatedDetail>(PROFILE_DISPLAY_NAME_UPDATED_EVENT, {
      detail: {
        displayName: normalizedDisplayName,
      },
    })
  );
}
