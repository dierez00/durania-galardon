import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordRecoveryEmail } = vi.hoisted(() => ({
  requestPasswordRecoveryEmail: vi.fn(),
}));

vi.mock("../../src/server/auth/provisioning", () => ({
  requestPasswordRecoveryEmail,
}));

import { POST } from "../../src/app/api/auth/password/recovery/route";

describe("POST /api/auth/password/recovery", () => {
  beforeEach(() => {
    requestPasswordRecoveryEmail.mockReset();
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost:3000/api/auth/password/recovery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "correo-invalido",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_PAYLOAD");
  });

  it("returns a generic success response for valid payloads", async () => {
    requestPasswordRecoveryEmail.mockRejectedValueOnce(new Error("SMTP failed"));

    const request = new Request("http://localhost:3000/api/auth/password/recovery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "usuario@example.com",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("recovery_email_requested");
    expect(requestPasswordRecoveryEmail).toHaveBeenCalledTimes(1);
  });
});
