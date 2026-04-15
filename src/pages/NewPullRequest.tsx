import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const NewPullRequest = () => {
  const { username, repoName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      if (!profile) return;
      const { data: repo } = await supabase.from("repositories").select("id").eq("owner_id", profile.id).eq("name", repoName).single();
      if (!repo) return;
      const { data } = await supabase
        .from("branches")
        .select("id, name, is_default")
        .eq("repo_id", repo.id)
        .order("is_default", { ascending: false })
        .order("name");
      const list = (data as { id: string; name: string; is_default: boolean }[]) || [];
      setBranches(list);
      const def = list.find((b) => b.is_default);
      if (def) setTargetBranch(def.name);
      const nonDefault = list.find((b) => !b.is_default);
      if (nonDefault) setSourceBranch(nonDefault.name);
      else if (list.length > 0) setSourceBranch(list[0].name);
    };
    fetchBranches();
  }, [username, repoName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (sourceBranch === targetBranch) {
      toast({ title: "Error", description: "Source and target branches must be different", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      const { data: repo } = await supabase.from("repositories").select("id").eq("owner_id", profile!.id).eq("name", repoName).single();
      const { error } = await supabase.from("pull_requests").insert({
        repo_id: repo!.id,
        author_id: user.id,
        title,
        body,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        pr_number: 0,
      });
      if (error) throw error;
      navigate(`/${username}/${repoName}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-xl font-bold mb-6">New Pull Request</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Source branch</label>
              <select value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-full">
                {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Target branch</label>
              <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-full">
                {branches.map((b) => <option key={b.id} value={b.name}>{b.name}{b.is_default ? " (default)" : ""}</option>)}
              </select>
            </div>
          </div>
          {sourceBranch === targetBranch && sourceBranch && (
            <p className="text-sm text-destructive">Source and target branches must be different.</p>
          )}
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="bg-secondary border-border" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your changes" rows={8} className="bg-secondary border-border" />
          <Button variant="gh-primary" disabled={loading || !title.trim() || sourceBranch === targetBranch}>
            {loading ? "Creating..." : "Create pull request"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewPullRequest;
