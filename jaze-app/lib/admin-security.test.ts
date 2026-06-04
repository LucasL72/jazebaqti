import { describe, it, expect } from "vitest";
import {
  validatePasswordComplexity,
  hashPassword,
  verifyPassword,
  isPasswordExpired,
} from "./admin-security";

describe("validatePasswordComplexity", () => {
  it("rejette un mot de passe trop simple", () => {
    expect(validatePasswordComplexity("short")).toBe(false);
    expect(validatePasswordComplexity("alllowercase123")).toBe(false);
  });

  it("accepte un mot de passe conforme à la politique", () => {
    expect(validatePasswordComplexity("ChangeMe!Complex123")).toBe(true);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("vérifie un mot de passe correctement haché", async () => {
    const hash = await hashPassword("ChangeMe!Complex123");
    expect(hash).not.toContain("ChangeMe");
    expect(await verifyPassword("ChangeMe!Complex123", hash)).toBe(true);
    expect(await verifyPassword("mauvais", hash)).toBe(false);
  });
});

describe("isPasswordExpired", () => {
  it("considère un mot de passe récent comme valide", () => {
    expect(isPasswordExpired(new Date())).toBe(false);
  });

  it("considère un mot de passe très ancien comme expiré", () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3650);
    expect(isPasswordExpired(old)).toBe(true);
  });
});
