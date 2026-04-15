import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, GitFork, Pin, PinOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface PinnedRepositoriesProps {
  profileId: string;
  username: string;
}

interface Repo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  stars_count: number;
  forks_count: number;
  is_public: boolean;
}

const PinnedRepositories = ({ profileId, username }: PinnedRepositoriesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pinnedRepos, setPinnedRepos] = useState<Repo[]>([]);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.id === profileId;

  const fetchPinned = async () => {
    const { data: pins } = await supabase
      .from("pinned_repositories")
      .select("repo_id, position")
      .eq("user_id", profileId)
      .order("position", { ascending: true });

    if (!pins || pins.length === 0) {
      setPinnedRepos([]);
      setPinnedIds(new Set());
      setLoading(false);
      return;
    }

    const repoIds = pins.map((p) => p.repo_id);
    const { data: repos } = await supabase
      .from("repositories")
      .select("id, name, description, language, stars_count, forks_count, is_public")
      .in("id", repoIds);

    // Sort by position
    const posMap = new Map(pins.map((p) => [p.repo_id, p.position]));
    const sorted = (repos || []).sort((a, b) => (posMap.get(a.id) || 0) - (posMap.get(b.id) || 0));
    setPinnedRepos(sorted as Repo[]);
    setPinnedIds(new Set(repoIds));
    setLoading(false);
  };

  useEffect(() => {
    fetchPinned();
  }, [profileId]);

  const openDialog = async () => {
    const { data } = await supabase
      .from("repositories")
      .select("id, name, description, language, stars_count, forks_count, is_public")
      .eq("owner_id", profileId)
      .order("updated_at", { ascending: false });
    setAllRepos((data as Repo[]) || []);
    setSelectedIds(new Set(pinnedIds));
    setDialogOpen(true);
  };

  const toggleRepo = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 6) next.add(id);
    else toast({ title: "Maximum 6 pinned repositories", variant: "destructive" });
    setSelectedIds(next);
  };

  const savePins = async () => {
    setSaving(true);
    // Delete all existing pins
    await supabase.from("pinned_repositories").delete().eq("user_id", profileId);
    // Insert new
    const inserts = Array.from(selectedIds).map((repo_id, i) => ({
      user_id: profileId,
      repo_id,
      position: i,
    }));
    if (inserts.length > 0) {
      await supabase.from("pinned_repositories").insert(inserts);
    }
    setDialogOpen(false);
    setSaving(false);
    fetchPinned();
  };

  if (loading) return null;
  if (!isOwner && pinnedRepos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
          <Pin className="w-3.5 h-3.5" />
          Pinned
        </h3>
        {isOwner && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={openDialog}>
            Customize pins
          </Button>
        )}
      </div>

      {pinnedRepos.length === 0 && isOwner ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-2">Pin your favorite repositories for quick access.</p>
          <Button variant="outline" size="sm" className="text-xs" onClick={openDialog}>
            Pin repositories
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pinnedRepos.map((repo) => (
            <Link
              key={repo.id}
              to={`/${username}/${repo.name}`}
              className="border border-border rounded-lg p-3 bg-card hover:bg-secondary/30 transition-colors block"
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-accent font-semibold text-sm hover:underline">{repo.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                  {repo.is_public ? "Public" : "Private"}
                </span>
              </div>
              {repo.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{repo.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {repo.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gh-yellow" />
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars_count}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pin repositories (max 6)</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
            {allRepos.map((repo) => (
              <label
                key={repo.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(repo.id)}
                  onCheckedChange={() => toggleRepo(repo.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{repo.name}</p>
                  {repo.description && <p className="text-xs text-muted-foreground truncate">{repo.description}</p>}
                </div>
              </label>
            ))}
            {allRepos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No repositories to pin.</p>
            )}
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">{selectedIds.size}/6 selected</span>
            <Button variant="gh-primary" size="sm" onClick={savePins} disabled={saving}>
              {saving ? "Saving..." : "Save pins"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PinnedRepositories;
