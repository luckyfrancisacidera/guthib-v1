import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const NewIssue = () => {
  const { username, repoName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      const { data: repo } = await supabase.from("repositories").select("id").eq("owner_id", profile!.id).eq("name", repoName).single();
      const { data: issue, error } = await supabase.from("issues").insert({
        repo_id: repo!.id,
        author_id: user.id,
        title,
        body,
        issue_number: 0, // trigger will set this
      }).select().single();
      if (error) throw error;
      navigate(`/${username}/${repoName}/issues/${issue.issue_number}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-xl font-bold mb-6">New Issue</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="bg-secondary border-border" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment" rows={10} className="bg-secondary border-border font-mono text-sm" />
          <Button variant="gh-primary" disabled={loading || !title.trim()}>
            {loading ? "Submitting..." : "Submit new issue"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewIssue;
