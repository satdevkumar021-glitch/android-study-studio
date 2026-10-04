export interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  groupId: string;
  tier: string | number;
  tags: string[];
  file: string;
  sectionCount: number;
  wordCount: number;
  minutes: number;
}
export interface Catalog {
  topics: Topic[];
  groups: {
    id: string;
    title: string;
    tier: string | number;
    topicIds: string[];
  }[];
}
export interface Lesson {
  id: string;
  title: string;
  sections: { id: string; title: string; html: string }[];
}
export interface Progress {
  status: "reading" | "complete";
  section?: string;
  updatedAt: number;
}
