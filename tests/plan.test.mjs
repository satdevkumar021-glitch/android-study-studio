import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";
const source = await fs.readFile(
  new URL("../src/study-plan.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { scheduleTopics } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const { topics } = JSON.parse(
  await fs.readFile(new URL("../public/data/catalog.json", import.meta.url)),
);
test("every plan preserves all chapters in prerequisite order without duplicates", () => {
  for (const weeks of [4, 8, 12]) {
    const schedule = scheduleTopics(topics, weeks);
    assert.equal(schedule.length, weeks);
    assert.deepEqual(
      schedule.flat().map((t) => t.id),
      topics.map((t) => t.id),
    );
    assert.ok(schedule.every((s) => s.length));
    const loads = schedule.map((s) => s.reduce((n, t) => n + t.minutes, 0));
    assert.ok(
      Math.max(...loads) - Math.min(...loads) <=
        2 * Math.max(...topics.map((t) => t.minutes)),
    );
  }
});
