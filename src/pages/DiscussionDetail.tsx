import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DiscussionDetail = () => {
  const { discussionId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussion, setDiscussion] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("discussions").select("*, profiles(username)").eq("id", discussionId).single();
      setDiscussion(data);
      if (data) {
        const { data: commentsData } = await supabase.from("discussion_comments").select("*, profiles(username)").eq("discussion_id", data.id).order("created_at");
        setComments(commentsData || []);
      }
      setLoading(false);
    };
    fetch();
  }, [discussionId]);

  const addComment = async () => {
    if (!user || !discussion || !newComment.trim()) return;
    const { data, error } = await supabase.from("discussion_comments").insert({
      discussion_id: discussion.id,
      author_id: user.id,
      body: newComment,
    }).select("*, profiles(username)").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setComments([...comments, data]);
    setNewComment("");
  };

  if (loading) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse h-48 bg-secondary rounded-lg" /></div></AppLayout>;
  if (!discussion) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-16 text-center"><h1 className="font-display text-xl font-bold">Discussion not found</h1></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5 text-accent" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">{discussion.category}</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-6">{discussion.title}</h1>

        <div className="border border-border rounded-lg mb-6">
          <div className="px-4 py-2 border-b border-border bg-secondary/30 text-xs text-muted-foreground">
            {discussion.profiles?.username} started this discussion
          </div>
          <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{discussion.body || "No description."}</div>
        </div>

        {comments.map((c) => (
          <div key={c.id} className="border border-border rounded-lg mb-4">
            <div className="px-4 py-2 border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              {c.profiles?.username}
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}

        {user && (
          <div className="space-y-3 mt-6">
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Reply..." rows={4} className="bg-secondary border-border" />
            <Button variant="gh-primary" size="sm" onClick={addComment} disabled={!newComment.trim()}>Reply</Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DiscussionDetail;
