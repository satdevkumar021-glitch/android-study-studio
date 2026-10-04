import fs from "node:fs/promises";
import path from "node:path";
import { parseHTML } from "linkedom";
const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "content/topics");
const destination = path.join(root, "public/data");
export function validateTopic(topic) {
  if (
    !/^\d+[A-Z]$/.test(topic.id) ||
    !topic.title?.trim() ||
    !topic.category?.trim() ||
    !topic.groupId ||
    !Array.isArray(topic.sections) ||
    !topic.sections.length
  )
    throw Error(`Invalid topic metadata: ${topic.id}`);
  const ids = new Set();
  for (const section of topic.sections) {
    if (
      !section.id ||
      ids.has(section.id) ||
      !section.title?.trim() ||
      typeof section.html !== "string"
    )
      throw Error(`Invalid section: ${topic.id}`);
    ids.add(section.id);
    const { document } = parseHTML(`<html><body>${section.html}</body></html>`);
    if (document.querySelector("script,style,iframe,object,embed,form"))
      throw Error(`Active content forbidden: ${topic.id}`);
    for (const el of document.querySelectorAll("*"))
      for (const attr of el.attributes) {
        if (
          /^on/i.test(attr.name) ||
          attr.name === "style" ||
          (["href", "src"].includes(attr.name) &&
            /^\s*(javascript|data|vbscript):/i.test(attr.value))
        )
          throw Error(`Unsafe markup: ${topic.id}`);
      }
  }
  return topic;
}
export async function buildContent() {
  const files = (await fs.readdir(source))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const topics = [];
  const groups = new Map();
  await fs.mkdir(path.join(destination, "topics"), { recursive: true });
  for (const file of files) {
    const topic = validateTopic(
      JSON.parse(await fs.readFile(path.join(source, file), "utf8")),
    );
    if (topics.some((t) => t.id === topic.id))
      throw Error(`Duplicate topic: ${topic.id}`);
    const { sections, sourceFile, ...meta } = topic;
    const text = sections
      .map(
        (s) => parseHTML(`<html><body>${s.html}</body></html>`).document.body.textContent || "",
      )
      .join(" ")
      .replace(/\s+/g, " ").trim();
    const wordCount = text ? text.split(" ").length : 0;
    const metadata = {
      ...meta,
      file: `topics/${topic.id}.json`,
      sectionCount: sections.length,
      wordCount,
      minutes: Math.max(1, Math.ceil(wordCount / 200)),
    };
    topics.push(metadata);
    if (!groups.has(topic.groupId))
      groups.set(topic.groupId, {
        id: topic.groupId,
        title: topic.category,
        tier: topic.tier,
        topicIds: [],
      });
    if (groups.get(topic.groupId).title !== topic.category || groups.get(topic.groupId).tier !== topic.tier)
      throw Error(`Inconsistent group metadata: ${topic.groupId}`);
    groups.get(topic.groupId).topicIds.push(topic.id);
    await fs.writeFile(
      path.join(destination, metadata.file),
      JSON.stringify({ ...metadata, sections, sourceFile }),
    );
  }
  const expectedFiles = new Set(topics.map(topic => `${topic.id}.json`));
  for (const file of await fs.readdir(path.join(destination, "topics")))
    if (file.endsWith(".json") && !expectedFiles.has(file)) await fs.unlink(path.join(destination, "topics", file));
  let sourceCommit;
  try { sourceCommit = JSON.parse(await fs.readFile(path.join(destination, "migration-report.json"), "utf8")).sourceCommit; } catch {}
  await fs.writeFile(
    path.join(destination, "catalog.json"),
    JSON.stringify({ version: 1, ...(sourceCommit ? { sourceCommit } : {}), groups: [...groups.values()], topics }),
  );
  console.log(`Built ${topics.length} chapters from canonical content.`);
  return topics;
}
if (process.argv[1] === import.meta.filename) await buildContent();
