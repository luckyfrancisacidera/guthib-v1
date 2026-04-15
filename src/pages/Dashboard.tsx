import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { BookOpen, GitFork, Plus, Star, Lock, Globe } from "lucide-react";
import ContributionGraph from "@/components/ContributionGraph";

interface Repo {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  language: string | null;
  stars_count: number;
  forks_count: number;
  updated_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: profile }, { data: repoData }] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", user.id).single(),
        supabase.from("repositories").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
      ]);
      setUsername(profile?.username || "");
      setRepos((repoData as Repo[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ago`;
    return "just now";
  };

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="text-center lg:text-left">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto lg:mx-0 text-2xl font-bold text-accent mb-3">
                {username?.[0]?.toUpperCase() || "?"}
              </div>
              <h2 className="font-display font-bold text-lg">{username}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="gh-outline" className="w-full" asChild>
              <Link to={`/${username}`}>View profile</Link>
            </Button>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-6 min-w-0">
            {user && <ContributionGraph userId={user.id} />}
            <div className="flex items-center justify-between gap-2 mb-6">
              <h2 className="font-display text-lg sm:text-xl font-bold truncate">Your repositories</h2>
              <Button variant="gh-primary" size="sm" asChild>
                <Link to="/new"><Plus className="w-4 h-4 mr-1" /> New</Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-5 animate-pulse h-24" />
                ))}
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-16 border border-border rounded-lg bg-card">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display font-semibold mb-2">No repositories yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first repository to get started.</p>
                <Button variant="gh-primary" asChild>
                  <Link to="/new">Create a repository</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-0 border border-border rounded-lg overflow-hidden">
                {repos.map((repo) => (
                  <div key={repo.id} className="p-4 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/${username}/${repo.name}`} className="text-accent font-semibold hover:underline">
                            {repo.name}
                          </Link>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                            {repo.is_public ? "Public" : "Private"}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mb-2">{repo.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-gh-yellow" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars_count}</span>
                          <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
                          <span>{timeAgo(repo.updated_at)}</span>
                        </div>
                      </div>
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

export default Dashboard;
