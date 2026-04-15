import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Star, GitFork, Calendar, TrendingUp, Clock, Flame } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDistanceToNow, subDays, subMonths, subYears, startOfYear, endOfYear } from "date-fns";

type SortOption = "stars" | "updated" | "forks" | "created";
type TimeFilter = "7d" | "30d" | "1y" | "all" | string; // string for specific year

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const sort = (searchParams.get("sort") as SortOption) || "stars";
  const time = searchParams.get("time") || "all";

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    p.set(key, value);
    setSearchParams(p, { replace: true });
  };

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      let query = supabase
        .from("repositories")
        .select("*, profiles(username)")
        .eq("is_public", true);

      // Time filter
      let cutoff: string | null = null;
      if (time === "7d") cutoff = subDays(new Date(), 7).toISOString();
      else if (time === "30d") cutoff = subMonths(new Date(), 1).toISOString();
      else if (time === "1y") cutoff = subYears(new Date(), 1).toISOString();
      else if (/^\d{4}$/.test(time)) {
        const y = parseInt(time);
        query = query
          .gte("updated_at", startOfYear(new Date(y, 0)).toISOString())
          .lte("updated_at", endOfYear(new Date(y, 0)).toISOString());
      }

      if (cutoff) query = query.gte("updated_at", cutoff);

      // Sort
      const sortCol = sort === "updated" ? "updated_at" : sort === "forks" ? "forks_count" : sort === "created" ? "created_at" : "stars_count";
      query = query.order(sortCol, { ascending: false }).limit(30);

      const { data } = await query;
      setRepos(data || []);
      setLoading(false);
    };
    fetchRepos();
  }, [sort, time]);

  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold mb-6">Explore repositories</h1>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setFilter("sort", v)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars"><span className="flex items-center gap-1.5"><Star className="w-3 h-3" />Most stars</span></SelectItem>
              <SelectItem value="forks"><span className="flex items-center gap-1.5"><GitFork className="w-3 h-3" />Most forks</span></SelectItem>
              <SelectItem value="updated"><span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />Recently updated</span></SelectItem>
              <SelectItem value="created"><span className="flex items-center gap-1.5"><Flame className="w-3 h-3" />Newest</span></SelectItem>
            </SelectContent>
          </Select>

          {/* Time quick toggles */}
          <ToggleGroup type="single" value={time} onValueChange={(v) => v && setFilter("time", v)} className="border border-border rounded-md p-0.5">
            <ToggleGroupItem value="all" className="text-xs h-8 px-3 rounded-sm">All time</ToggleGroupItem>
            <ToggleGroupItem value="7d" className="text-xs h-8 px-3 rounded-sm">7 days</ToggleGroupItem>
            <ToggleGroupItem value="30d" className="text-xs h-8 px-3 rounded-sm">30 days</ToggleGroupItem>
            <ToggleGroupItem value="1y" className="text-xs h-8 px-3 rounded-sm">1 year</ToggleGroupItem>
          </ToggleGroup>

          {/* Specific year */}
          <Select value={/^\d{4}$/.test(time) ? time : ""} onValueChange={(v) => setFilter("time", v)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />)}</div>
        ) : repos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No repositories found for this time range.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {repos.map((repo) => (
              <div key={repo.id} className="p-4 border-b border-border last:border-b-0 hover:bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <Link to={`/${repo.profiles?.username}`} className="text-sm text-muted-foreground hover:text-accent">{repo.profiles?.username}</Link>
                  <span className="text-muted-foreground">/</span>
                  <Link to={`/${repo.profiles?.username}/${repo.name}`} className="text-accent font-semibold hover:underline text-sm">{repo.name}</Link>
                </div>
                {repo.description && <p className="text-xs text-muted-foreground mb-2">{repo.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {repo.language && <span>{repo.language}</span>}
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars_count}</span>
                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
                  <span>Updated {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Explore;
