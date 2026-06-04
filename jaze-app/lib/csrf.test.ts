import { describe, it, expect } from "vitest";
import { validateCsrfRequest, CSRF_COOKIE_NAME } from "./csrf";

function makeRequest(headerToken?: string, cookieToken?: string) {
  const headers = new Headers();
  if (headerToken) headers.set("x-csrf-token", headerToken);
  if (cookieToken) headers.set("cookie", `${CSRF_COOKIE_NAME}=${cookieToken}`);
  return new Request("https://example.com/api/test", { method: "POST", headers });
}

describe("validateCsrfRequest", () => {
  it("rejette si le header ou le cookie manque", () => {
    expect(validateCsrfRequest(makeRequest(undefined, "abc"))).toBe(false);
    expect(validateCsrfRequest(makeRequest("abc", undefined))).toBe(false);
  });

  it("rejette si header et cookie diffèrent", () => {
    expect(validateCsrfRequest(makeRequest("aaa", "bbb"))).toBe(false);
  });

  it("accepte si header et cookie correspondent", () => {
    const token = "a".repeat(64);
    expect(validateCsrfRequest(makeRequest(token, token))).toBe(true);
  });
});
