import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/services/auth/password";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/services/auth/rate-limit";
import { hashSessionToken, sessionTokenFromRequest } from "@/services/auth/session";
import { verifyLoginCredential } from "@/services/auth/login";

afterEach(() => resetLoginRateLimit());

describe("authentication primitives", () => {
  it("hashes and verifies passwords with Argon2id", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "wrong password")).resolves.toBe(false);
  });

  it("limits repeated login attempts", () => {
    for (let index = 0; index < 10; index += 1) expect(checkLoginRateLimit("ip:127.0.0.1").allowed).toBe(true);
    expect(checkLoginRateLimit("ip:127.0.0.1").allowed).toBe(false);
  });

  it("verifies successful and failed login credentials at the service boundary", async () => {
    const passwordHash = await hashPassword("operator-password");
    await expect(verifyLoginCredential({ userStatus: "ACTIVE", passwordHash, password: "operator-password" })).resolves.toBe(true);
    await expect(verifyLoginCredential({ userStatus: "ACTIVE", passwordHash, password: "wrong-password" })).resolves.toBe(false);
    await expect(verifyLoginCredential({ userStatus: "DISABLED", passwordHash, password: "operator-password" })).resolves.toBe(false);
  });

  it("hashes session tokens deterministically and extracts bearer or cookie tokens", () => {
    expect(hashSessionToken("session-token", "a-secret")).toBe(hashSessionToken("session-token", "a-secret"));
    expect(hashSessionToken("session-token", "a-secret")).not.toBe(hashSessionToken("other-token", "a-secret"));
    expect(sessionTokenFromRequest(new Request("http://localhost", { headers: { authorization: "Bearer bearer-token" } }), "bsa_session")).toBe("bearer-token");
    expect(sessionTokenFromRequest(new Request("http://localhost", { headers: { cookie: "theme=dark; bsa_session=cookie-token" } }), "bsa_session")).toBe("cookie-token");
  });
});
