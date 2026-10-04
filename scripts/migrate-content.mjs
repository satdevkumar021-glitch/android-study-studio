import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const source = path.resolve(
  process.argv[2] || "/tmp/android-study-community-topics",
);
const output = path.join(project, "public/data");
const index = await fs.readFile(path.join(source, "index.html"), "utf8");
const start = index.indexOf("const SECTIONS = ");
assert(start >= 0, "Source dashboard catalog is missing");
const end = index.indexOf("\n];", start);
assert(end > start, "Source dashboard catalog does not end correctly");
const groupsSource = vm.runInNewContext(
  index.slice(start + "const SECTIONS = ".length, end + 2),
  {},
  { timeout: 1000 },
);
let sourceCommit = "unknown";
try {
  sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim();
} catch {}
const clean = (value) => value.replace(/\s+/g, " ").trim();
const codeText = (element) =>
  Array.from(element.querySelectorAll("pre")).map((pre) =>
    pre.textContent.replace(/\r\n/g, "\n"),
  );
const topics = [];
const groups = [];
const lessons = [];
const repairs = [];
const htmlTags = new Set(
  "html head title meta link style body header nav main footer section article aside div span p h1 h2 h3 h4 h5 h6 pre code strong em b i u s br hr ul ol li table thead tbody tfoot tr td th caption details summary button a script input label form select option textarea small blockquote".split(
    " ",
  ),
);
const seen = new Set();
await fs.mkdir(path.join(output, "topics"), { recursive: true });
await fs.mkdir(path.join(project, "content/topics"), { recursive: true });

for (const group of groupsSource) {
  groups.push({
    id: group.id,
    title: group.title,
    tier: group.tier,
    topicIds: group.topics.map((topic) => topic.id),
  });
  for (const topic of group.topics) {
    assert(!seen.has(topic.id), `Duplicate topic ${topic.id}`);
    seen.add(topic.id);
    const raw = await fs.readFile(path.join(source, topic.file), "utf8");
    // A few legacy answers contain literal comparisons such as right<s.length.
    // Escape non-HTML tag starts before parsing so their text cannot swallow later quizzes.
    let repaired = 0;
    const safeRaw = raw.replace(
      /<(\/?)([A-Za-z][A-Za-z0-9.-]*)(?=[\s>/])/g,
      (match, slash, name) => {
        if (htmlTags.has(name.toLowerCase())) return match;
        repaired += 1;
        return `&lt;${slash}${name}`;
      },
    );
    if (repaired)
      repairs.push({ id: topic.id, escapedNonHtmlTagStarts: repaired });
    const { document } = parseHTML(safeRaw);
    const main = document.querySelector("main");
    assert(main, `Missing main in ${topic.id}`);
    const sectionsSource = Array.from(main.children).filter(
      (element) =>
        element.id &&
        (element.tagName === "SECTION" ||
          element.classList.contains("section")),
    );
    assert(sectionsSource.length > 0, `No sections in ${topic.id}`);
    const beforeCode = codeText(main);
    const beforeQuizzes = main.querySelectorAll(".quiz-card, details").length;
    const beforeTables = main.querySelectorAll("table").length;
    const heroTitle = clean(
      main.querySelector("h1")?.textContent || topic.name,
    );
    const title = heroTitle.replace(/^\d+[A-Z]\s*[—–\-·]\s*/, "");
    const description = clean(
      main.querySelector(".hero-desc")?.textContent ||
        main.querySelector(".hero .meta")?.textContent ||
        topic.tags.join(" · "),
    ).replace(/^Tier [123]\s*/, "");
    const sections = sectionsSource.map((section) => {
      const heading = section.querySelector(".section-title, h2");
      const sectionTitle = clean(heading?.textContent || section.id)
        .replace(/^[^\p{L}\p{N}]+/u, "")
        .replace(/^\d+[.\s·—–-]+/, "");
      heading?.remove();
      section
        .querySelectorAll(
          "script, style, nav, .nav-buttons, .progress-bar, .section-icon",
        )
        .forEach((node) => node.remove());
      section.querySelectorAll(".quiz-card").forEach((card) => {
        const question = card.querySelector(".quiz-q-text");
        const answer = card.querySelector(".quiz-a");
        assert(
          question && answer,
          `Incomplete quiz in ${topic.id}/${section.id}`,
        );
        const details = document.createElement("details");
        details.className = "quiz-card";
        const summary = document.createElement("summary");
        summary.innerHTML = question.innerHTML;
        details.append(summary);
        const answerBody = document.createElement("div");
        answerBody.className = "quiz-answer";
        answerBody.innerHTML = answer.innerHTML;
        details.append(answerBody);
        card.replaceWith(details);
      });
      section.querySelectorAll("*").forEach((element) => {
        for (const attribute of Array.from(element.attributes)) {
          const name = attribute.name.toLowerCase();
          if (name.startsWith("on") || name === "style" || name === "srcdoc")
            element.removeAttribute(attribute.name);
          if (
            (name === "href" || name === "src") &&
            /^\s*(javascript|data):/i.test(attribute.value)
          )
            element.removeAttribute(attribute.name);
        }
        if (
          element.tagName === "A" &&
          element.getAttribute("href")?.startsWith("https://")
        )
          element.setAttribute("rel", "noopener noreferrer");
      });
      assert(
        !section.querySelector("script, style, iframe"),
        `Unsafe content remains in ${topic.id}`,
      );
      return {
        id: section.id,
        title: sectionTitle,
        html: section.innerHTML.trim(),
      };
    });
    const migrated = parseHTML(
      `<main>${sections.map((section) => section.html).join("\n")}</main>`,
    ).document.querySelector("main");
    assert.deepEqual(
      codeText(migrated),
      beforeCode,
      `Code text changed in ${topic.id}`,
    );
    assert.equal(
      migrated.querySelectorAll("details").length,
      beforeQuizzes,
      `Quiz count changed in ${topic.id}`,
    );
    assert.equal(
      migrated.querySelectorAll("table").length,
      beforeTables,
      `Table count changed in ${topic.id}`,
    );
    const wordCount = clean(migrated.textContent).split(/\s+/).length;
    const metadata = {
      id: topic.id,
      title,
      description,
      category: group.title,
      groupId: group.id,
      tier: group.tier,
      tags: topic.tags,
      file: `topics/${topic.id}.json`,
      sectionCount: sections.length,
      wordCount,
      minutes: Math.max(1, Math.ceil(wordCount / 200)),
    };
    topics.push(metadata);
    lessons.push({
      id: topic.id,
      sections: sections.length,
      quizzes: beforeQuizzes,
      codeBlocks: beforeCode.length,
      tables: beforeTables,
    });
    const payload =
      JSON.stringify(
        { ...metadata, sections, sourceFile: topic.file },
        null,
        2,
      ) + "\n";
    await fs.writeFile(
      path.join(output, "topics", `${topic.id}.json`),
      payload,
    );
    await fs.writeFile(
      path.join(project, "content/topics", `${topic.id}.json`),
      payload,
    );
  }
}
const lessonFiles = (
  await fs.readdir(path.join(source, "android_interview_pdfs"))
).filter((file) => /^\d+[A-Z]_.*\.html$/.test(file));
assert.equal(
  topics.length,
  lessonFiles.length,
  "Dashboard and lesson file counts differ; review uncatalogued lessons",
);
const totals = lessons.reduce(
  (result, lesson) => {
    for (const key of ["sections", "quizzes", "codeBlocks", "tables"])
      result[key] += lesson[key];
    return result;
  },
  { topics: topics.length, sections: 0, quizzes: 0, codeBlocks: 0, tables: 0 },
);
await fs.writeFile(
  path.join(output, "catalog.json"),
  JSON.stringify({ version: 1, sourceCommit, groups, topics }, null, 2) + "\n",
);
await fs.writeFile(
  path.join(output, "migration-report.json"),
  JSON.stringify(
    {
      version: 1,
      sourceCommit,
      checks: [
        "Every catalogued source lesson is migrated",
        "Code block text preserved exactly after repairing literal non-HTML tag starts",
        "Quiz counts preserved and rendered as native details",
        "Table counts preserved",
        "Legacy scripts, navigation, inline handlers and styles removed",
      ],
      totals,
      repairs,
      lessons,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(totals));
