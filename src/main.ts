import { scheduleTopics } from "./study-plan";
import { sponsorship } from "./site-config";
import "./styles.css";
import type { Catalog, Topic, Lesson, Progress } from "./types";
import { readProgress, saveProgress, validateProgress, theme } from "./storage";
const app = document.querySelector<HTMLDivElement>("#app")!;
let catalog: Catalog;
let progress = readProgress();
let request = 0;
let observer: IntersectionObserver | undefined;
const cache = new Map<string, Lesson>();
const escape = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icon = (name: string) =>
  ({ menu: "☰", theme: "◐", arrow: "↗", search: "⌕" })[name] || name;
document.documentElement.dataset.theme = theme();
const route = () => location.hash.slice(1) || "/";
function sponsorPlacement() {
  if (!sponsorship) return "";
  const sponsor = sponsorship as {
    name: string;
    description: string;
    url: string;
  };
  if (!sponsor.url.startsWith("https://")) return "";
  return `<aside class="sponsor-placement" aria-label="Sponsored placement"><p class="eyebrow">SPONSORED</p><a href="${escape(sponsor.url)}" rel="sponsored noopener" target="_blank">${escape(sponsor.name)}</a><p>${escape(sponsor.description)}</p></aside>`;
}
function toast(message: string) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 4000);
}
function write() {
  try {
    saveProgress(progress);
  } catch {
    toast("Progress could not be saved. Export it before closing this page.");
  }
}
function shell() {
  const path = route();
  app.innerHTML = `<div class="app-shell"><aside class="sidebar" aria-label="Main navigation"><a class="brand" href="#/"><span class="brand-mark">a/</span><span>Android<br><strong>Study Studio</strong></span></a><p class="sidebar-caption">YOUR LEARNING WORKSPACE</p><nav><a class="nav-link ${path === "/" ? "active" : ""}" href="#/">Overview <span>01</span></a><a class="nav-link ${path.startsWith("/library") ? "active" : ""}" href="#/library">Topic library <span>${catalog.topics.length}</span></a><a class="nav-link ${path === "/plan" ? "active" : ""}" href="#/plan">Preparation plan <span>03</span></a></nav><div class="sidebar-bottom"><p>Built for thoughtful<br>Android engineers.</p><small>By Satdev Kumar</small><div><button class="icon-button" data-export>Export progress</button><button class="icon-button" data-import>Import</button></div><input type="file" id="progress-import" accept="application/json" hidden><small>Progress stays on this device.</small></div></aside><button class="sidebar-overlay" aria-label="Close navigation" hidden></button><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu-button" aria-label="Open navigation">${icon("menu")}</button><span class="breadcrumb">THE ENGINEERING NOTEBOOK <span>/ ANDROID</span></span><div class="topbar-actions"><a class="icon-button" href="#/library">Search topics ${icon("search")}</a><button class="icon-button" data-theme-toggle aria-label="Switch color theme">${icon("theme")}</button></div></header><main class="content" id="main" tabindex="-1"></main><footer class="footer"><span>Less switching. More understanding.</span><a href="#/about">About & privacy</a></footer></div></div>`;
  app.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const value =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem("android-study-studio.theme", value);
    } catch {}
  });
  const sidebar = app.querySelector(".sidebar")!;
  const overlay = app.querySelector<HTMLButtonElement>(".sidebar-overlay")!;
  app.querySelector(".mobile-menu-button")?.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    overlay.hidden = !sidebar.classList.contains("is-open");
    overlay.classList.toggle("is-open", !overlay.hidden);
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    overlay.hidden = true;
    overlay.classList.remove("is-open");
  });
  app.querySelector("[data-export]")?.addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "android-study-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  const input = app.querySelector<HTMLInputElement>("#progress-import")!;
  app
    .querySelector("[data-import]")
    ?.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    try {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 200000) throw Error("File must be under 200 KB.");
      const imported = validateProgress(JSON.parse(await file.text()));
      progress = {
        ...progress,
        ...Object.fromEntries(
          Object.entries(imported).filter(([id]) =>
            catalog.topics.some((t) => t.id === id),
          ),
        ),
      };
      write();
      await render();
      toast("Progress imported.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not import progress.",
      );
    }
  });
}
const header = (eyebrow: string, title: string, description: string) =>
  `<div class="page-header"><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${title}</h1><p class="page-description">${description}</p></div>`;
function cards(topics: Topic[]) {
  return `<div class="topic-grid">${topics.map((t) => `<a class="topic-card" href="#/topic/${t.id}"><div class="topic-category"><span class="topic-code">${t.id}</span><span>${escape(t.category)}</span></div><h3 class="topic-title">${escape(t.title)}</h3><p class="topic-description">${escape(t.description)}</p><div class="topic-footer"><span>${t.minutes} min · ${progress[t.id]?.status === "complete" ? "Completed" : "Read & practice"}</span><span>→</span></div></a>`).join("")}</div>`;
}
function overview(main: HTMLElement) {
  const done = catalog.topics.filter(
    (t) => progress[t.id]?.status === "complete",
  ).length;
  const recent = Object.entries(progress)
    .filter(([, p]) => p.status === "reading")
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const next =
    catalog.topics.find((t) => t.id === recent?.[0]) ||
    catalog.topics.find((t) => progress[t.id]?.status !== "complete") ||
    catalog.topics[0];
  main.innerHTML =
    header(
      "A LITTLE PROGRESS, EVERY DAY",
      "Learn with intention.",
      "One quiet place to connect the fundamentals, practice your reasoning, and prepare for your next Android interview.",
    ) +
    `<div class="hero-grid"><section class="hero-primary"><p class="hero-label">${recent ? "PICK UP WHERE YOU LEFT OFF" : "YOUR NEXT CHAPTER"}</p><h2 class="hero-title">${escape(next.title)}</h2><p class="hero-note">${escape(next.description)}</p><a class="nav-link" href="#/topic/${next.id}">${recent ? "Continue reading" : "Start reading"} <span>→</span></a></section><aside class="hero-aside"><p class="hero-label">THE PREPARATION PATH</p><h2>Build understanding.<br>Then test it.</h2><p>Choose a pace that fits your week. Read, write a small example, and explain the trade-offs out loud.</p><a href="#/plan">Find your pace →</a></aside></div><div class="stats-row"><div class="stat"><strong>${catalog.topics.length}</strong><span>Curated topics</span></div><div class="stat"><strong>${catalog.groups.length}</strong><span>Engineering areas</span></div><div class="stat"><strong>${done}</strong><span>Completed by you</span></div><div class="stat"><strong>${Math.round((done / catalog.topics.length) * 100)}%</strong><span>Your progress</span></div></div><div class="section-heading"><div><p class="eyebrow">START WITH THE FOUNDATIONS</p><h2>Clear chapters. Deep understanding.</h2></div><a href="#/library">Explore the library →</a></div>${cards(catalog.topics.slice(0, 6))}`;
}
function library(main: HTMLElement) {
  main.innerHTML =
    header(
      "THE TOPIC LIBRARY",
      "Find your next question.",
      "Search by concept or browse an engineering area. Each chapter keeps explanations, code and practice together.",
    ) +
    `<div class="toolbar"><label class="sr-only" for="topic-search">Search topics</label><input id="topic-search" class="search-input" placeholder="Search Kotlin, caching, system design…"><label class="sr-only" for="topic-group">Engineering area</label><select id="topic-group" class="filter-select"><option value="">All areas</option>${catalog.groups.map((g) => `<option value="${escape(g.id)}">${escape(g.title)}</option>`).join("")}</select><label class="sr-only" for="topic-status">Progress</label><select id="topic-status" class="filter-select"><option value="">Any progress</option><option value="unread">Not completed</option><option value="complete">Completed</option></select></div><p id="result-count" class="eyebrow" aria-live="polite"></p><div id="library-results"></div>`;
  const update = () => {
    const q = main
      .querySelector<HTMLInputElement>("#topic-search")!
      .value.toLowerCase()
      .trim();
    const group = main.querySelector<HTMLSelectElement>("#topic-group")!.value;
    const status =
      main.querySelector<HTMLSelectElement>("#topic-status")!.value;
    const found = catalog.topics.filter(
      (t) =>
        (!q ||
          [t.title, t.description, ...t.tags]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        (!group || t.groupId === group) &&
        (!status ||
          (status === "complete"
            ? progress[t.id]?.status === "complete"
            : progress[t.id]?.status !== "complete")),
    );
    main.querySelector("#result-count")!.textContent = `${found.length} topics`;
    main.querySelector("#library-results")!.innerHTML = found.length
      ? cards(found)
      : '<div class="empty-state"><h2>No topics found.</h2><p>Try a broader search or change the filters.</p></div>';
  };
  main
    .querySelectorAll("input,select")
    .forEach((el) => el.addEventListener("input", update));
  update();
}
function plan(main: HTMLElement) {
  main.innerHTML =
    header(
      "A PLAN YOU CAN ADAPT",
      "Consistency beats cramming.",
      "These are preparation guides, not promises. Adjust the workload to your experience and the role you’re targeting.",
    ) +
    `<div class="roadmap-grid">${[
      ["4", "Intensive", "4–5 hours/day"],
      ["8", "Balanced", "2–3 hours/day"],
      ["12", "Steady", "1–2 hours/day"],
    ]
      .map(
        ([weeks, name, time]) =>
          `<button class="roadmap-card" data-weeks="${weeks}"><p class="eyebrow">${name.toUpperCase()}</p><h2>${weeks} weeks</h2><p>${time}</p><span>View this plan →</span></button>`,
      )
      .join("")}</div><div id="schedule" class="schedule-list"></div>`;
  const show = (weeks: number) => {
    const schedule = scheduleTopics(catalog.topics, weeks);
    main.querySelector("#schedule")!.innerHTML =
      `<div class="section-heading"><h2>Your ${weeks}-week outline</h2></div>` +
      schedule
        .map((subset, i) => {
          const minutes = subset.reduce((sum, topic) => sum + topic.minutes, 0);
          const areas = [...new Set(subset.map((topic) => topic.category))];
          return `<section class="schedule-row"><span class="topic-code">W${i + 1}</span><div><h3>${areas.map(escape).join(" · ")}</h3><p>About ${Math.round((minutes / 60) * 10) / 10} hours of reading, plus coding, recall and revision. Build one small example and explain its trade-offs.</p><div class="schedule-topics">${subset.map((topic) => `<a href="#/topic/${topic.id}">${topic.id} — ${escape(topic.title)}</a>`).join("")}</div></div></section>`;
        })
        .join("") +
      `<div class="practice-panel"><h3>Make room for recall and a mock interview.</h3><p>Reserve one session each week to revisit difficult chapters without looking at the answer. In the final week, practice coding, system design and a few concrete leadership stories. Topic completion is a personal checkpoint, not an assessment of job readiness.</p></div>`;
  };
  main
    .querySelectorAll("[data-weeks]")
    .forEach((el) =>
      el.addEventListener("click", () =>
        show(Number((el as HTMLElement).dataset.weeks)),
      ),
    );
  show(8);
}
async function reader(main: HTMLElement, id: string, token: number) {
  const meta = catalog.topics.find((t) => t.id === id);
  if (!meta) {
    main.innerHTML =
      header(
        "TOPIC NOT FOUND",
        "This chapter isn’t here.",
        "Return to the library to find a topic.",
      ) + '<a href="#/library">Browse topics →</a>';
    return;
  }
  main.innerHTML = '<p role="status">Opening your chapter…</p>';
  try {
    let lesson = cache.get(id);
    if (!lesson) {
      const response = await fetch("/data/" + meta.file);
      if (!response.ok) throw Error("Chapter could not be loaded.");
      lesson = (await response.json()) as Lesson;
      cache.set(id, lesson);
    }
    if (token !== request) return;
    document.title = `${meta.title} — Android Study Studio`;
    const resume = progress[id]?.section;
    progress[id] = {
      ...progress[id],
      status: progress[id]?.status || "reading",
      updatedAt: Date.now(),
    };
    write();
    main.innerHTML = `<div class="reader-layout"><article class="reader-main"><header class="reader-header"><a href="#/library">← Topic library</a><p class="eyebrow">${escape(meta.category)} / ${id}</p><h1 class="page-title">${escape(meta.title)}</h1><p class="page-description">${escape(meta.description)}</p><div class="reader-meta"><span>${meta.minutes} min read</span><span>${lesson.sections.length} sections</span><span>Read at your own pace</span></div>${resume ? '<button class="icon-button" id="resume-reading">Return to saved position ↓</button>' : ""}</header><div class="lesson-content">${lesson.sections.map((s, i) => `<section class="lesson-section" id="${escape(s.id)}"><p class="section-label">SECTION ${String(i + 1).padStart(2, "0")}</p><h2>${escape(s.title)}</h2>${s.html}</section>`).join("")}</div>${sponsorPlacement()}<div class="reader-bottom"><button class="icon-button" id="complete-topic">${progress[id].status === "complete" ? "Completed ✓" : "Mark chapter complete"}</button>${catalog.topics[catalog.topics.indexOf(meta) + 1] ? `<a href="#/topic/${catalog.topics[catalog.topics.indexOf(meta) + 1].id}">Next chapter →</a>` : '<a href="#/library">Return to library →</a>'}</div></article><aside class="reader-toc"><p class="eyebrow">IN THIS CHAPTER</p>${lesson.sections.map((s) => `<a class="toc-link" href="#${escape(s.id)}" data-section="${escape(s.id)}">${escape(s.title)}</a>`).join("")}<div class="practice-panel"><strong>Read. Try. Explain.</strong><p>Code an example before opening a practice answer. The article stays in one continuous view.</p></div></aside></div>`;
    main.querySelector(".lesson-content")?.addEventListener("click", (e) => {
      const link = (e.target as Element).closest("a");
      if (link?.getAttribute("href")?.startsWith("#")) {
        const target = document.getElementById(
          link.getAttribute("href")!.slice(1),
        );
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
    main.querySelectorAll("[data-section]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        document
          .getElementById((el as HTMLElement).dataset.section!)
          ?.scrollIntoView({ behavior: "smooth" });
      }),
    );
    main
      .querySelector("#resume-reading")
      ?.addEventListener("click", () =>
        document.getElementById(resume!)?.scrollIntoView(),
      );
    main.querySelector("#complete-topic")?.addEventListener("click", (e) => {
      const complete = progress[id].status !== "complete";
      progress[id] = {
        ...progress[id],
        status: complete ? "complete" : "reading",
        updatedAt: Date.now(),
      };
      write();
      (e.target as HTMLElement).textContent = complete
        ? "Completed ✓"
        : "Mark chapter complete";
      toast(
        complete ? "Chapter marked complete." : "Chapter marked for reading.",
      );
    });
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const section = entry.target.id;
            progress[id] = { ...progress[id], section, updatedAt: Date.now() };
            write();
            main
              .querySelectorAll(".toc-link")
              .forEach((el) =>
                el.classList.toggle(
                  "active",
                  (el as HTMLElement).dataset.section === section,
                ),
              );
          }
        }
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    main
      .querySelectorAll(".lesson-section")
      .forEach((el) => observer!.observe(el));
  } catch {
    if (token === request)
      main.innerHTML =
        '<div class="empty-state"><h2>Unable to open this chapter.</h2><p>Check your connection and try again.</p><button class="icon-button" id="retry-lesson">Retry</button></div>';
    main
      .querySelector("#retry-lesson")
      ?.addEventListener("click", () => render());
  }
}
async function render() {
  const token = ++request;
  observer?.disconnect();
  shell();
  const main = app.querySelector<HTMLElement>("#main")!;
  document.title = "Android Study Studio — Learn with intention";
  const path = route();
  if (path === "/") overview(main);
  else if (path === "/library") library(main);
  else if (path === "/plan") plan(main);
  else if (path.startsWith("/topic/"))
    await reader(main, path.split("/")[2], token);
  else if (path === "/about")
    main.innerHTML =
      header(
        "ABOUT THIS WORKSPACE",
        "A notebook for the craft.",
        "Created by Satdev Kumar for Android engineers who want to understand the choices behind the code.",
      ) +
      '<div class="practice-panel"><h2>Your data and this preview</h2><p>No account, analytics or advertising service is connected. Reading progress and theme preferences are stored in your browser. Export progress to move it to another device or domain; a new Firebase domain cannot automatically read progress from GitHub Pages.</p><h2>Content and limitations</h2><p>The original 97 lessons have been migrated into a shared reader. This architecture update preserves their teaching material; it is not a complete technical fact-check of every legacy claim. Use primary documentation when making production decisions.</p><h2>Optional support</h2><p>Future sponsorship can use a clearly labeled placement after a chapter. Advertising is disabled here and does not interrupt the study flow. Privacy disclosures, consent where required, and provider approval must be completed before advertising is activated.</p></div>';
  else
    main.innerHTML =
      header(
        "PAGE NOT FOUND",
        "Let’s get you back to studying.",
        "This route is not available.",
      ) + '<a href="#/library">Open the library →</a>';
  window.scrollTo(0, 0);
}
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector<HTMLElement>("#main")?.focus();
});
window.addEventListener("hashchange", () => render());
fetch("/data/catalog.json")
  .then(async (response) => {
    if (!response.ok) throw Error();
    catalog = await response.json();
    await render();
  })
  .catch(() => {
    app.innerHTML =
      '<main class="content"><h1>The library could not load.</h1><p>Please check your connection and refresh.</p></main>';
  });
