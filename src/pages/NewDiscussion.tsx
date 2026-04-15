import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const categories = ["general", "ideas", "q-and-a", "show-and-tell"];

const NewDiscussion = () => {
  const { username, repoName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).single();
      const { data: repo } = await supabase.from("repositories").select("id").eq("owner_id", profile!.id).eq("name", repoName).single();
      const { data, error } = await supabase.from("discussions").insert({
        repo_id: repo!.id,
        author_id: user.id,
        title,
        body,
        category,
      }).select().single();
      if (error) throw error;
      navigate(`/${username}/${repoName}/discussions/${data.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-xl font-bold mb-6">New Discussion</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-full max-w-xs">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="bg-secondary border-border" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start the discussion..." rows={8} className="bg-secondary border-border" />
          <Button variant="gh-primary" disabled={loading || !title.trim()}>
            {loading ? "Creating..." : "Start discussion"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewDiscussion;
