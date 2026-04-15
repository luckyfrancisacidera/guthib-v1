import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Star } from "lucide-react";

interface ProfileListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  type: "followers" | "following" | "repositories";
  username: string;
}

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface RepoItem {
  id: string;
  name: string;
  description: string | null;
  stars_count: number;
  language: string | null;
}

export default function ProfileListModal({ open, onOpenChange, profileId, type, username }: ProfileListModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetch = async () => {
      if (type === "repositories") {
        const { data } = await supabase
          .from("repositories")
          .select("id, name, description, stars_count, language")
          .eq("owner_id", profileId)
          .eq("is_public", true)
          .order("updated_at", { ascending: false });
        setRepos((data as RepoItem[]) || []);
      } else {
        const col = type === "followers" ? "following_id" : "follower_id";
        const joinCol = type === "followers" ? "follower_id" : "following_id";
        const { data: follows } = await supabase
          .from("user_follows" as any)
          .select(joinCol)
          .eq(col, profileId);

        if (follows && follows.length > 0) {
          const ids = follows.map((f: any) => f[joinCol]);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", ids);
          setUsers((profiles as UserItem[]) || []);
        } else {
          setUsers([]);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [open, profileId, type]);

  const title = type === "followers" ? "Followers" : type === "following" ? "Following" : "Public Repositories";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : type === "repositories" ? (
            repos.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No public repositories
              </div>
            ) : (
              <div className="divide-y divide-border">
                {repos.map((repo) => (
                  <Link
                    key={repo.id}
                    to={`/${username}/${repo.name}`}
                    onClick={() => onOpenChange(false)}
                    className="block py-3 hover:bg-secondary/30 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <span className="text-accent font-semibold text-sm hover:underline">{repo.name}</span>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars_count}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            users.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No {type} yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    to={`/${u.username}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 py-3 hover:bg-secondary/30 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        u.username?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <span className="text-sm font-medium text-accent hover:underline">{u.username}</span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
