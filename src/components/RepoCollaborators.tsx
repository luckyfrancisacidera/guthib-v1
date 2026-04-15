import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  repoId: string;
  isOwner: boolean;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  username: string;
  avatar_url: string | null;
}

const RepoCollaborators = ({ repoId, isOwner }: Props) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from("repo_collaborators")
      .select("id, user_id, role")
      .eq("repo_id", repoId);

    if (!data || data.length === 0) {
      setCollaborators([]);
      return;
    }

    const userIds = data.map((c) => c.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    setCollaborators(
      data.map((c) => ({
        ...c,
        username: profileMap.get(c.user_id)?.username || "unknown",
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      }))
    );
  };

  useEffect(() => {
    fetchCollaborators();
  }, [repoId]);

  const addCollaborator = async () => {
    if (!usernameInput.trim()) return;
    setAdding(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", usernameInput.trim())
      .maybeSingle();

    if (!profile) {
      toast.error("User not found");
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("repo_collaborators")
      .insert({ repo_id: repoId, user_id: profile.id });

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already a collaborator" : error.message);
    } else {
      toast.success(`Added ${usernameInput.trim()} as collaborator`);
      setUsernameInput("");
      fetchCollaborators();
    }
    setAdding(false);
  };

  const removeCollaborator = async (collabId: string, username: string) => {
    await supabase.from("repo_collaborators").delete().eq("id", collabId);
    toast.success(`Removed ${username}`);
    fetchCollaborators();
  };

  return (
    <div className="border border-border rounded-lg p-4 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" /> Collaborators
        <span className="text-xs font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
          {collaborators.length}
        </span>
      </h3>

      {collaborators.length > 0 && (
        <div className="space-y-2 mb-3">
          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium">
                  {c.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm">{c.username}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{c.role}</span>
              </div>
              {isOwner && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCollaborator(c.id, c.username)}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="flex gap-2">
          <Input
            placeholder="Username to add..."
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addCollaborator()}
          />
          <Button variant="gh-primary" size="sm" onClick={addCollaborator} disabled={adding || !usernameInput.trim()}>
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RepoCollaborators;
