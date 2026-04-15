import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import {
  parseSearchQuery,
  getOperatorValue,
  getOperatorValues,
  SearchResult,
  OPERATOR_HINTS,
} from "@/lib/searchParser";
import { Search, BookOpen, CircleDot, GitPullRequest, User, FileText, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabType = "all" | "repo" | "issue" | "pr" | "user" | "file";

const TAB_CONFIG: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Search className="w-3.5 h-3.5" /> },
  { key: "repo", label: "Repositories", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: "issue", label: "Issues", icon: <CircleDot className="w-3.5 h-3.5" /> },
  { key: "pr", label: "Pull Requests", icon: <GitPullRequest className="w-3.5 h-3.5" /> },
  { key: "user", label: "Users", icon: <User className="w-3.5 h-3.5" /> },
  { key: "file", label: "Files", icon: <FileText className="w-3.5 h-3.5" /> },
];

const RESULT_ICONS: Record<string, React.ReactNode> = {
  repo: <BookOpen className="w-4 h-4 text-muted-foreground" />,
  issue: <CircleDot className="w-4 h-4 text-emerald-500" />,
  pr: <GitPullRequest className="w-4 h-4 text-purple-500" />,
  user: <User className="w-4 h-4 text-muted-foreground" />,
  file: <FileText className="w-4 h-4 text-muted-foreground" />,
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [showHints, setShowHints] = useState(!initialQuery);

  const executeSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowHints(true);
      return;
    }
    setShowHints(false);
    setLoading(true);

    const parsed = parseSearchQuery(q);
    const typeFilter = getOperatorValue(parsed, "type");
    const userFilter = getOperatorValue(parsed, "user");
    const repoFilter = getOperatorValue(parsed, "repo");
    const isFilters = getOperatorValues(parsed, "is");
    const languageFilter = getOperatorValue(parsed, "language");
    const labelFilters = getOperatorValues(parsed, "label");
    const filenameFilter = getOperatorValue(parsed, "filename");
    const createdFilter = getOperatorValue(parsed, "created");
    const kw = parsed.keywords;

    const allResults: SearchResult[] = [];

    // Search repositories
    if (!typeFilter || typeFilter === "repo") {
      let rq = supabase.from("repositories").select("*, profiles!repositories_owner_id_fkey(username)").eq("is_public", true);
      if (kw) rq = rq.or(`name.ilike.%${kw}%,description.ilike.%${kw}%`);
      if (repoFilter) rq = rq.ilike("name", `%${repoFilter}%`);
      if (languageFilter) rq = rq.ilike("language", `%${languageFilter}%`);
      if (isFilters.includes("public")) rq = rq.eq("is_public", true);
      if (isFilters.includes("private")) rq = rq.eq("is_public", false);
      if (createdFilter) {
        if (createdFilter.startsWith(">")) rq = rq.gte("created_at", createdFilter.slice(1));
        else if (createdFilter.startsWith("<")) rq = rq.lte("created_at", createdFilter.slice(1));
      }
      if (userFilter) {
        // Need to filter by username through join — fetch all then filter
      }

      const { data } = await rq.limit(50);
      (data || []).forEach((r: any) => {
        const owner = r.profiles?.username || "unknown";
        if (userFilter && !owner.toLowerCase().includes(userFilter.toLowerCase())) return;
        allResults.push({
          type: "repo",
          id: r.id,
          title: `${owner}/${r.name}`,
          description: r.description || undefined,
          link: `/${owner}/${r.name}`,
          meta: { language: r.language || "", stars: r.stars_count, forks: r.forks_count, is_public: r.is_public },
          created_at: r.created_at,
        });
      });
    }

    // Search issues
    if (!typeFilter || typeFilter === "issue") {
      let iq = supabase.from("issues").select("*, repositories!issues_repo_id_fkey(name, owner_id, is_public, profiles:profiles!repositories_owner_id_fkey(username)), profiles!issues_author_id_fkey(username)").eq("repositories.is_public", true);
      if (kw) iq = iq.or(`title.ilike.%${kw}%,body.ilike.%${kw}%`);
      if (isFilters.includes("open")) iq = iq.eq("status", "open");
      if (isFilters.includes("closed")) iq = iq.eq("status", "closed");
      if (labelFilters.length > 0) iq = iq.contains("labels", labelFilters);
      if (createdFilter) {
        if (createdFilter.startsWith(">")) iq = iq.gte("created_at", createdFilter.slice(1));
        else if (createdFilter.startsWith("<")) iq = iq.lte("created_at", createdFilter.slice(1));
      }

      const { data } = await iq.limit(50);
      (data || []).forEach((i: any) => {
        const repo = i.repositories;
        if (!repo) return;
        const owner = repo.profiles?.username || "unknown";
        const author = i.profiles?.username || "unknown";
        if (userFilter && !author.toLowerCase().includes(userFilter.toLowerCase())) return;
        if (repoFilter && !repo.name.toLowerCase().includes(repoFilter.toLowerCase())) return;
        allResults.push({
          type: "issue",
          id: i.id,
          title: i.title,
          subtitle: `${owner}/${repo.name} #${i.issue_number}`,
          description: i.body?.slice(0, 120) || undefined,
          link: `/${owner}/${repo.name}/issues/${i.issue_number}`,
          meta: { status: i.status, author, labels: (i.labels || []).join(", ") },
          created_at: i.created_at,
        });
      });
    }

    // Search pull requests
    if (!typeFilter || typeFilter === "pr") {
      let pq = supabase.from("pull_requests").select("*, repositories!pull_requests_repo_id_fkey(name, owner_id, is_public, profiles:profiles!repositories_owner_id_fkey(username)), profiles!pull_requests_author_id_fkey(username)").eq("repositories.is_public", true);
      if (kw) pq = pq.or(`title.ilike.%${kw}%,body.ilike.%${kw}%`);
      if (isFilters.includes("open")) pq = pq.eq("status", "open");
      if (isFilters.includes("closed")) pq = pq.eq("status", "closed");
      if (isFilters.includes("merged")) pq = pq.eq("status", "merged");
      if (createdFilter) {
        if (createdFilter.startsWith(">")) pq = pq.gte("created_at", createdFilter.slice(1));
        else if (createdFilter.startsWith("<")) pq = pq.lte("created_at", createdFilter.slice(1));
      }

      const { data } = await pq.limit(50);
      (data || []).forEach((p: any) => {
        const repo = p.repositories;
        if (!repo) return;
        const owner = repo.profiles?.username || "unknown";
        const author = p.profiles?.username || "unknown";
        if (userFilter && !author.toLowerCase().includes(userFilter.toLowerCase())) return;
        if (repoFilter && !repo.name.toLowerCase().includes(repoFilter.toLowerCase())) return;
        allResults.push({
          type: "pr",
          id: p.id,
          title: p.title,
          subtitle: `${owner}/${repo.name} #${p.pr_number}`,
          description: p.body?.slice(0, 120) || undefined,
          link: `/${owner}/${repo.name}`,
          meta: { status: p.status, author, source: p.source_branch, target: p.target_branch },
          created_at: p.created_at,
        });
      });
    }

    // Search users
    if (!typeFilter || typeFilter === "user") {
      let uq = supabase.from("profiles").select("*");
      if (kw) uq = uq.or(`username.ilike.%${kw}%,full_name.ilike.%${kw}%,bio.ilike.%${kw}%`);
      if (userFilter) uq = uq.ilike("username", `%${userFilter}%`);

      const { data } = await uq.limit(30);
      (data || []).forEach((u: any) => {
        allResults.push({
          type: "user",
          id: u.id,
          title: u.username,
          subtitle: u.full_name || undefined,
          description: u.bio || undefined,
          link: `/${u.username}`,
          meta: { location: u.location || "" },
          created_at: u.created_at,
        });
      });
    }

    // Search files
    if (!typeFilter || typeFilter === "file") {
      let fq = supabase.from("repo_files").select("*, repositories!repo_files_repo_id_fkey(name, owner_id, is_public, profiles:profiles!repositories_owner_id_fkey(username))").eq("is_directory", false).eq("repositories.is_public", true);
      if (kw) fq = fq.or(`file_name.ilike.%${kw}%,file_path.ilike.%${kw}%`);
      if (filenameFilter) fq = fq.ilike("file_name", `%${filenameFilter}%`);
      if (repoFilter) {
        // Filter client-side
      }

      const { data } = await fq.limit(50);
      (data || []).forEach((f: any) => {
        const repo = f.repositories;
        if (!repo) return;
        const owner = repo.profiles?.username || "unknown";
        if (repoFilter && !repo.name.toLowerCase().includes(repoFilter.toLowerCase())) return;
        allResults.push({
          type: "file",
          id: f.id,
          title: f.file_name,
          subtitle: `${owner}/${repo.name}/${f.file_path}`,
          link: `/${owner}/${repo.name}`,
          meta: { path: f.file_path, size: f.file_size || 0 },
          created_at: f.created_at,
        });
      });
    }

    // Sort
    const sortOp = getOperatorValue(parsed, "sort") || sortBy;
    if (sortOp === "newest") allResults.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    else if (sortOp === "oldest") allResults.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    else if (sortOp === "stars") allResults.sort((a, b) => ((b.meta?.stars as number) || 0) - ((a.meta?.stars as number) || 0));

    setResults(allResults);
    setLoading(false);
  }, [sortBy]);

  useEffect(() => {
    if (initialQuery) executeSearch(initialQuery);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    executeSearch(query);
  };

  const filtered = activeTab === "all" ? results : results.filter((r) => r.type === activeTab);

  const typeCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const timeAgo = (date?: string) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    return "just now";
  };

  return (
    <AppLayout>
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search GutHib... (e.g. type:repo language:python, is:issue is:open bug)'
              className="pl-10 pr-10 h-10 bg-secondary border-border text-sm"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setResults([]); setShowHints(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Operator hints */}
        {showHints && (
          <div className="mb-6 border border-border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Search operators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OPERATOR_HINTS.map((h) => (
                <button
                  key={h.operator}
                  className="text-left p-2 rounded-md hover:bg-secondary/50 transition-colors group"
                  onClick={() => { setQuery(h.example + " "); setShowHints(false); }}
                >
                  <code className="text-xs font-mono text-accent">{h.operator}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!showHints && (
          <>
            {/* Tabs + sort */}
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                {TAB_CONFIG.map((tab) => {
                  const count = tab.key === "all" ? results.length : (typeCounts[tab.key] || 0);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
                        activeTab === tab.key
                          ? "bg-accent/20 text-accent font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {count > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{count}</Badge>}
                    </button>
                  );
                })}
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most relevant</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="stars">Most stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-semibold text-sm mb-1">No results found</h3>
                <p className="text-xs text-muted-foreground">Try different keywords or search operators</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {filtered.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    to={result.link}
                    className="flex items-start gap-3 p-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="mt-0.5">{RESULT_ICONS[result.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-accent font-semibold text-sm hover:underline truncate">{result.title}</span>
                        {result.meta?.status && (
                          <Badge variant="outline" className={`text-[10px] h-4 ${
                            result.meta.status === "open" ? "border-emerald-500/50 text-emerald-500" :
                            result.meta.status === "merged" ? "border-purple-500/50 text-purple-500" :
                            "border-muted-foreground/50"
                          }`}>
                            {String(result.meta.status)}
                          </Badge>
                        )}
                        {result.meta?.is_public === false && (
                          <Badge variant="outline" className="text-[10px] h-4">Private</Badge>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{result.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        {result.meta?.language && <span>{String(result.meta.language)}</span>}
                        {result.meta?.stars !== undefined && Number(result.meta.stars) > 0 && <span>★ {String(result.meta.stars)}</span>}
                        {result.meta?.labels && <span>{String(result.meta.labels)}</span>}
                        {result.created_at && <span>{timeAgo(result.created_at)}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default SearchPage;
