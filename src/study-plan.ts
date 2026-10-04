import type { Topic } from "./types";
// Keep prerequisite order while balancing estimated reading time, rather than
// assigning the same number of categories with very different chapter counts.
export function scheduleTopics(topics: Topic[], weeks: number): Topic[][] {
  if (!Number.isInteger(weeks) || weeks < 1) throw Error("Invalid week count");
  const schedule: Topic[][] = [];
  let cursor = 0;
  let remaining = topics.reduce((sum, t) => sum + t.minutes, 0);
  for (let week = 0; week < weeks; week++) {
    const bucket: Topic[] = [];
    const target = remaining / (weeks - week);
    let minutes = 0;
    while (cursor < topics.length) {
      const next = topics[cursor];
      if (
        bucket.length &&
        minutes + next.minutes > target &&
        Math.abs(minutes - target) <= Math.abs(minutes + next.minutes - target)
      )
        break;
      if (bucket.length && topics.length - cursor <= weeks - week - 1) break;
      bucket.push(next);
      cursor++;
      minutes += next.minutes;
    }
    remaining -= minutes;
    schedule.push(bucket);
  }
  if (cursor < topics.length)
    schedule[schedule.length - 1].push(...topics.slice(cursor));
  return schedule;
}
