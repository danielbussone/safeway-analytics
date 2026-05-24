import { describe, expect, it } from "vitest";
import {
  decodeJwtExp,
  extractTokenFromRefreshResponse,
  TokenManager,
} from "./TokenManager.js";
import { normalizeProductName, resolveProduct } from "./resolveProduct.js";

describe("resolveProduct", () => {
  it("uses bpn as primary id", () => {
    const product = resolveProduct({
      id: "7313000132",
      bpn: "196050883",
      name: "OROWEAT BREAD",
    });
    expect(product.id).toBe("196050883");
    expect(product.bpn).toBe("196050883");
  });

  it("falls back to upc when bpn is missing", () => {
    const product = resolveProduct({
      id: "7313000132",
      name: "GENERIC ITEM",
      upc: "7313000132",
    });
    expect(product.id).toBe("upc:7313000132");
  });

  it("falls back to normalized name hash", () => {
    const product = resolveProduct({
      id: "",
      name: "Loose Produce",
    });
    expect(product.id.startsWith("name:")).toBe(true);
  });

  it("normalizes product names", () => {
    expect(normalizeProductName("  Oroweat  12 OZ Bread! ")).toBe(
      "OROWEAT BREAD",
    );
  });
});

describe("TokenManager helpers", () => {
  it("decodes jwt exp", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 4102444800 })).toString(
      "base64url",
    );
    const token = `header.${payload}.sig`;
    expect(decodeJwtExp(token)).toBe(4102444800);
  });

  it("extracts token from refresh response", () => {
    expect(
      extractTokenFromRefreshResponse({ sessionToken: "abc123" }),
    ).toBe("abc123");
    expect(
      extractTokenFromRefreshResponse({ data: { token: "nested" } }),
    ).toBe("nested");
  });

  it("ensureFreshToken does not call Okta when token is valid", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    const token = `hdr.${payload}.sig`;
    const manager = new TokenManager({ JWT_TOKEN: token });
    await expect(manager.ensureFreshToken()).resolves.toBe(token);
  });

  it("ensureFreshToken rejects expired tokens", async () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    const token = `hdr.${payload}.sig`;
    const manager = new TokenManager({ JWT_TOKEN: token });
    await expect(manager.ensureFreshToken()).rejects.toThrow(/expired/i);
  });
});
