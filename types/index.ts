export type ContentType = 'article' | 'youtube' | 'social' | 'pdf' | 'image' | 'repo';

export interface Topic {
  id: string;
  name: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  content_type: ContentType | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkWithTopics extends Bookmark {
  topics: string[];
}

export interface AnalyzeResult {
  title: string;
  summary: string;
  topics: string[];
}
