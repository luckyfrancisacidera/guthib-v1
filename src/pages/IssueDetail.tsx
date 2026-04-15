import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircleDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const IssueDetail = () => {
  const { username, repoName, issueNumber } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [issue, setIssue] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      if (!profile) { setLoading(false); return; }
      const { data: repo } = await supabase.from("repositories").select("id").eq("owner_id", profile.id).eq("name", repoName).single();
      if (!repo) { setLoading(false); return; }
      const { data: issueData } = await supabase.from("issues").select("*, profiles(username)").eq("repo_id", repo.id).eq("issue_number", Number(issueNumber)).single();
      setIssue(issueData);
      if (issueData) {
        const { data: commentsData } = await supabase.from("issue_comments").select("*, profiles(username)").eq("issue_id", issueData.id).order("created_at");
        setComments(commentsData || []);
      }
      setLoading(false);
    };
    fetch();
  }, [username, repoName, issueNumber]);

  const addComment = async () => {
    if (!user || !issue || !newComment.trim()) return;
    const { data, error } = await supabase.from("issue_comments").insert({
      issue_id: issue.id,
      author_id: user.id,
      body: newComment,
    }).select("*, profiles(username)").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setComments([...comments, data]);
    setNewComment("");
  };

  const toggleStatus = async () => {
    if (!issue) return;
    const newStatus = issue.status === "open" ? "closed" : "open";
    await supabase.from("issues").update({ status: newStatus }).eq("id", issue.id);
    setIssue({ ...issue, status: newStatus });
  };

  if (loading) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse h-48 bg-secondary rounded-lg" /></div></AppLayout>;
  if (!issue) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-16 text-center"><h1 className="font-display text-xl font-bold">Issue not found</h1></div></AppLayout>;

  const canClose = user?.id === issue.author_id;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold mb-1">{issue.title} <span className="text-muted-foreground font-normal">#{issue.issue_number}</span></h1>
        <div className="flex items-center gap-2 mb-6">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${issue.status === "open" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            <CircleDot className="w-3 h-3" /> {issue.status}
          </span>
          <span className="text-sm text-muted-foreground">{issue.profiles?.username} opened this issue</span>
        </div>

        {/* Issue body */}
        <div className="border border-border rounded-lg mb-6">
          <div className="px-4 py-2 border-b border-border bg-secondary/30 text-xs text-muted-foreground">
            {issue.profiles?.username} commented
          </div>
          <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{issue.body || "No description provided."}</div>
        </div>

        {/* Comments */}
        {comments.map((c) => (
          <div key={c.id} className="border border-border rounded-lg mb-4">
            <div className="px-4 py-2 border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              {c.profiles?.username} commented
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}

        {/* Add comment */}
        {user && (
          <div className="space-y-3 mt-6">
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Leave a comment" rows={4} className="bg-secondary border-border" />
            <div className="flex items-center gap-2">
              <Button variant="gh-primary" size="sm" onClick={addComment} disabled={!newComment.trim()}>Comment</Button>
              {canClose && (
                <Button variant="gh-outline" size="sm" onClick={toggleStatus}>
                  {issue.status === "open" ? "Close issue" : "Reopen issue"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default IssueDetail;
