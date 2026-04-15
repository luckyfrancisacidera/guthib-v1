export interface SearchOperator {
  key: string;
  value: string;
}

export interface ParsedSearch {
  keywords: string;
  operators: SearchOperator[];
}

const VALID_OPERATORS = new Set([
  "repo", "user", "is", "label", "assignee", "branch",
  "filename", "type", "language", "created", "updated",
  "sort", "stars", "forks",
]);

export function parseSearchQuery(query: string): ParsedSearch {
  const operators: SearchOperator[] = [];
  const keywords: string[] = [];

  // Match quoted strings and operator:value pairs
  const regex = /(\w+):(?:"([^"]+)"|(\S+))|"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(query)) !== null) {
    if (match[1]) {
      // operator:value
      const key = match[1].toLowerCase();
      const value = match[2] || match[3] || "";
      if (VALID_OPERATORS.has(key)) {
        operators.push({ key, value });
      } else {
        // Treat unknown operators as keywords
        keywords.push(match[0]);
      }
    } else {
      // Plain keyword or quoted string
      keywords.push(match[4] || match[5] || "");
    }
  }

  return {
    keywords: keywords.join(" ").trim(),
    operators,
  };
}

export function getOperatorValue(parsed: ParsedSearch, key: string): string | undefined {
  const op = parsed.operators.find((o) => o.key === key);
  return op?.value;
}

export function getOperatorValues(parsed: ParsedSearch, key: string): string[] {
  return parsed.operators.filter((o) => o.key === key).map((o) => o.value);
}

export type SearchResultType = "repo" | "issue" | "pr" | "user" | "file";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  link: string;
  meta?: Record<string, string | number | boolean>;
  created_at?: string;
}

export const OPERATOR_HINTS = [
  { operator: "type:", description: "Filter by type (repo, issue, pr, user, file)", example: "type:repo" },
  { operator: "user:", description: "Filter by username", example: "user:alice" },
  { operator: "repo:", description: "Filter by repository name", example: "repo:my-project" },
  { operator: "is:", description: "Filter by state (open, closed, merged, public, private)", example: "is:open" },
  { operator: "language:", description: "Filter by programming language", example: "language:typescript" },
  { operator: "label:", description: "Filter issues by label", example: "label:bug" },
  { operator: "filename:", description: "Search by filename", example: "filename:README.md" },
  { operator: "created:", description: "Filter by creation date (>, <, range)", example: "created:>2026-01-01" },
  { operator: "sort:", description: "Sort results (newest, oldest, stars)", example: "sort:newest" },
  { operator: "stars:", description: "Filter repos by star count", example: "stars:>5" },
];
