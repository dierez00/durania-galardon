import { describe, expect, it } from "vitest";
import { parseAuthCallbackState } from "../../src/modules/auth/shared/callback";

describe("parseAuthCallbackState", () => {
  it("reads token_hash and type from query params", () => {
    const state = parseAuthCallbackState(
      new URLSearchParams("token_hash=hash123&type=invite"),
      ""
    );

    expect(state.type).toBe("invite");
    expect(state.tokenHash).toBe("hash123");
    expect(state.accessToken).toBeNull();
  });

  it("reads access tokens and errors from hash redirects", () => {
    const state = parseAuthCallbackState(
      new URLSearchParams("type=recovery"),
      "#access_token=token123&refresh_token=refresh123&error_description=Link%20expired"
    );

    expect(state.type).toBe("recovery");
    expect(state.accessToken).toBe("token123");
    expect(state.refreshToken).toBe("refresh123");
    expect(state.errorDescription).toBe("Link expired");
  });
});
