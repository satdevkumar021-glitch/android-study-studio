import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
// Compile the real module, including on Node without native TypeScript support.
const source = await fs.readFile(
  new URL("../src/storage.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { validateProgress, readProgress, saveProgress } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
test("valid progress preserves completed chapters and reading sections", () => {
  const value = {
    "1A": { status: "complete", updatedAt: 1700000000000 },
    "23A": { status: "reading", updatedAt: 1700000001000, section: "s10" },
  };
  assert.deepEqual(validateProgress(value), value);
});
test("import copies only supported fields", () => {
  const value = {
    "1A": {
      status: "reading",
      updatedAt: 10,
      section: "s1",
      arbitrary: "<script>ignored</script>",
    },
  };
  const result = validateProgress(value);
  assert.deepEqual(result, {
    "1A": { status: "reading", updatedAt: 10, section: "s1" },
  });
  assert.notEqual(result["1A"], value["1A"]);
});
test("invalid file shapes, IDs, statuses, timestamps and sections are rejected", () => {
  for (const value of [
    null,
    [],
    "text",
    1,
    { __proto__x: {} },
    { "1A": null },
    { "1A": { status: "unknown", updatedAt: 1 } },
    { "1A": { status: "reading", updatedAt: Infinity } },
    { "1A": { status: "reading", updatedAt: "1" } },
    { "1A": { status: "reading", updatedAt: 1, section: {} } },
  ])
    assert.throws(() => validateProgress(value));
});
test("oversized imports fail before processing entries", () => {
  const value = Object.fromEntries(
    Array.from({ length: 1001 }, (_, index) => [
      `${index}A`,
      { status: "reading", updatedAt: 1 },
    ]),
  );
  assert.throws(() => validateProgress(value), /too large/);
});
test("corrupt stored progress and unavailable storage recover safely", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: { getItem: () => "{broken" },
    });
    assert.deepEqual(readProgress(), {});
    globalThis.localStorage = {
      getItem: () => {
        throw Error("Unavailable");
      },
    };
    assert.deepEqual(readProgress(), {});
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", original);
  }
});
test("writing and reading use the same namespaced storage key", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
    });
    const progress = { "1A": { status: "complete", updatedAt: 42 } };
    saveProgress(progress);
    assert.equal(values.has("android-study-studio.progress.v1"), true);
    assert.deepEqual(readProgress(), progress);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", original);
  }
});
