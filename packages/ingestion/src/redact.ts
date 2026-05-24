const SENSITIVE_KEY =
  /token|clubcard|authorization|password|secret|session|cookie|last4|cardnumber/i;

export function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactValue(nested);
      }
    }
    return out;
  }
  if (typeof value === "string") {
    if (value.length > 80 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(value)) {
      return "[REDACTED_JWT]";
    }
    if (/^\d{10,}$/.test(value)) {
      return "[REDACTED_ID]";
    }
  }
  return value;
}

export type SchemaNode =
  | { type: "null" }
  | { type: "array"; items: SchemaNode | null; length: number }
  | { type: "object"; fields: Record<string, SchemaNode> }
  | { type: "string"; example?: string }
  | { type: "number" }
  | { type: "boolean" }
  | { type: "unknown" };

export function inferSchema(value: unknown, depth = 0): SchemaNode {
  if (value === null) {
    return { type: "null" };
  }
  if (Array.isArray(value)) {
    const sample = value.length > 0 ? inferSchema(value[0], depth + 1) : null;
    return { type: "array", items: sample, length: value.length };
  }
  if (typeof value === "object") {
    if (depth >= 4) {
      return { type: "object", fields: {} };
    }
    const fields: Record<string, SchemaNode> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      fields[key] = inferSchema(nested, depth + 1);
    }
    return { type: "object", fields };
  }
  if (typeof value === "string") {
    return { type: "string", example: value.slice(0, 80) };
  }
  if (typeof value === "number") {
    return { type: "number" };
  }
  if (typeof value === "boolean") {
    return { type: "boolean" };
  }
  return { type: "unknown" };
}

export function topLevelKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [`<array length=${value.length}>`];
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort();
  }
  return [typeof value];
}
