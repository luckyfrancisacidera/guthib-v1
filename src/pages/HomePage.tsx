import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Star, GitFork, GitCommit, GitPullRequest, CircleDot, BookOpen, TrendingUp, Activity, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrendingRepo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  stars_count: number;
  forks_count: number;
  updated_at: string;
  owner_username: string;
}

interface FeedItem {
  id: string;
  type: "commit" | "pr" | "issue";
  title: string;
  subtitle: string;
  link: string;
  created_at: string;
  meta?: Record<string, string>;
}

const HomePage = () => {
  const { user } = useAuth();
  const [trending, setTrending] = useState<TrendingRepo[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [trendingSort, setTrendingSort] = useState("stars");
  const [feedFilter, setFeedFilter] = useState("all");

  // Fetch trending repos
  useEffect(() => {
    const fetchTrending = async () => {
      setLoadingTrending(true);
      let q = supabase
        .from("repositories")
        .select("*, profiles!repositories_owner_id_fkey(username)")
        .eq("is_public", true);

      if (trendingSort === "stars") q = q.order("stars_count", { ascending: false });
      else if (trendingSort === "recent") q = q.order("updated_at", { ascending: false });
      else if (trendingSort === "forks") q = q.order("forks_count", { ascending: false });

      const { data } = await q.limit(10);
      setTrending(
        (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          language: r.language,
          stars_count: r.stars_count,
          forks_count: r.forks_count,
          updated_at: r.updated_at,
          owner_username: r.profiles?.username || "unknown",
        }))
      );
      setLoadingTrending(false);
    };
    fetchTrending();
  }, [trendingSort]);

  // Fetch personalized activity feed
  useEffect(() => {
    if (!user) {
      setLoadingFeed(false);
      return;
    }
    const fetchFeed = async () => {
      setLoadingFeed(true);
      const items: FeedItem[] = [];

      // Get followed user IDs
      const { data: followData } = await supabase
        .from("user_follows" as any)
        .select("following_id")
        .eq("follower_id", user.id);
      const followedIds = [user.id, ...((followData || []) as any[]).map((f: any) => f.following_id)];

      // Fetch user's commits
      if (feedFilter === "all" || feedFilter === "commits") {
        const { data: commits } = await supabase
          .from("commits")
          .select("id, message, created_at, repo_id, repositories!commits_repo_id_fkey(name, profiles:profiles!repositories_owner_id_fkey(username))")
          .in("author_id", followedIds)
          .order("created_at", { ascending: false })
          .limit(15);

        (commits || []).forEach((c: any) => {
          const repo = c.repositories;
          const owner = repo?.profiles?.username || "unknown";
          items.push({
            id: `commit-${c.id}`,
            type: "commit",
            title: c.message,
            subtitle: `${owner}/${repo?.name}`,
            link: `/${owner}/${repo?.name}`,
            created_at: c.created_at,
          });
        });
      }

      // Fetch user's PRs
      if (feedFilter === "all" || feedFilter === "prs") {
        const { data: prs } = await supabase
          .from("pull_requests")
          .select("id, title, status, created_at, pr_number, repo_id, repositories!pull_requests_repo_id_fkey(name, profiles:profiles!repositories_owner_id_fkey(username))")
          .in("author_id", followedIds)
          .order("created_at", { ascending: false })
          .limit(10);

        (prs || []).forEach((p: any) => {
          const repo = p.repositories;
          const owner = repo?.profiles?.username || "unknown";
          items.push({
            id: `pr-${p.id}`,
            type: "pr",
            title: p.title,
            subtitle: `${owner}/${repo?.name} #${p.pr_number}`,
            link: `/${owner}/${repo?.name}`,
            created_at: p.created_at,
            meta: { status: p.status },
          });
        });
      }

      // Fetch user's issues
      if (feedFilter === "all" || feedFilter === "issues") {
        const { data: issues } = await supabase
          .from("issues")
          .select("id, title, status, created_at, issue_number, repo_id, repositories!issues_repo_id_fkey(name, profiles:profiles!repositories_owner_id_fkey(username))")
          .in("author_id", followedIds)
          .order("created_at", { ascending: false })
          .limit(10);

        (issues || []).forEach((i: any) => {
          const repo = i.repositories;
          const owner = repo?.profiles?.username || "unknown";
          items.push({
            id: `issue-${i.id}`,
            type: "issue",
            title: i.title,
            subtitle: `${owner}/${repo?.name} #${i.issue_number}`,
            link: `/${owner}/${repo?.name}/issues/${i.issue_number}`,
            created_at: i.created_at,
            meta: { status: i.status },
          });
        });
      }

      // Sort by date
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFeed(items.slice(0, 20));
      setLoadingFeed(false);
    };
    fetchFeed();
  }, [user, feedFilter]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const FEED_ICONS: Record<string, React.ReactNode> = {
    commit: <GitCommit className="w-4 h-4 text-muted-foreground" />,
    pr: <GitPullRequest className="w-4 h-4 text-purple-500" />,
    issue: <CircleDot className="w-4 h-4 text-emerald-500" />,
  };

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Activity Feed — left/main column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2 min-w-0">
                <Activity className="w-5 h-5 shrink-0" />
                <span className="truncate">Your Activity</span>
              </h2>
              <Select value={feedFilter} onValueChange={setFeedFilter}>
                <SelectTrigger className="w-28 h-7 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="commits">Commits</SelectItem>
                  <SelectItem value="prs">Pull Requests</SelectItem>
                  <SelectItem value="issues">Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!user ? (
              <div className="border border-border rounded-lg p-8 text-center bg-card">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-semibold mb-1">Sign in to see your feed</h3>
                <p className="text-sm text-muted-foreground mb-4">Your personalized activity feed will appear here.</p>
                <Link to="/auth" className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  Sign in
                </Link>
              </div>
            ) : loadingFeed ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="border border-border rounded-lg p-8 text-center bg-card">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-semibold mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground">Start by creating a repository, opening an issue, or making a commit.</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {feed.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="flex items-start gap-3 p-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="mt-0.5">{FEED_ICONS[item.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                        {item.meta?.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            item.meta.status === "open" ? "border-emerald-500/50 text-emerald-500" :
                            item.meta.status === "merged" ? "border-purple-500/50 text-purple-500" :
                            "border-muted-foreground/50 text-muted-foreground"
                          }`}>
                            {item.meta.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">{timeAgo(item.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Trending repos — right sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="truncate">Trending Repositories</span>
              </h3>
              <Select value={trendingSort} onValueChange={setTrendingSort}>
                <SelectTrigger className="w-24 h-7 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="forks">Forks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingTrending ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : trending.length === 0 ? (
              <div className="border border-border rounded-lg p-6 text-center bg-card">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No public repositories yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trending.map((repo, idx) => (
                  <div key={repo.id} className="border border-border rounded-lg p-3 bg-card hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono w-4">{idx + 1}</span>
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      <Link
                        to={`/${repo.owner_username}/${repo.name}`}
                        className="text-sm text-accent font-semibold hover:underline truncate"
                      >
                        {repo.owner_username}/{repo.name}
                      </Link>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 pl-6">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-gh-yellow" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />{repo.stars_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" />{repo.forks_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
