import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validateTopic } from "../scripts/build-content.mjs";
const catalog = JSON.parse(
  await fs.readFile(new URL("../public/data/catalog.json", import.meta.url)),
);
test("all 97 migrated chapters are valid and uniquely catalogued", async () => {
  assert.equal(catalog.topics.length, 97);
  assert.equal(new Set(catalog.topics.map((t) => t.id)).size, 97);
  for (const topic of catalog.topics) {
    const lesson = JSON.parse(
      await fs.readFile(
        new URL("../public/data/" + topic.file, import.meta.url),
      ),
    );
    validateTopic(lesson);
    assert.equal(lesson.sections.length, topic.sectionCount);
  }
  assert.equal(catalog.groups.flatMap((g) => g.topicIds).length, 97);
});
test("unsafe executable content and duplicate sections fail the build", () => {
  const base = {
    id: "1A",
    title: "Test",
    category: "Kotlin",
    groupId: "s1",
    sections: [{ id: "s1", title: "Intro", html: "<p>Safe</p>" }],
  };
  for (const html of [
    "<script>alert(1)</script>",
    '<img src="x" onerror="alert(1)">',
    '<a href="javascript:alert(1)">Link</a>',
  ])
    assert.throws(() =>
      validateTopic({ ...base, sections: [{ ...base.sections[0], html }] }),
    );
  assert.throws(() =>
    validateTopic({ ...base, sections: [base.sections[0], base.sections[0]] }),
  );
});
