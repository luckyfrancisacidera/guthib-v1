import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

const NewRepo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [initReadme, setInitReadme] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
      const { data: repoData, error } = await supabase.from("repositories").insert({
        owner_id: user.id,
        name: slug,
        description,
        is_public: isPublic,
      }).select().single();
      if (error) throw error;

      if (initReadme && repoData) {
        // Wait briefly for the trigger to create the default branch
        await new Promise((r) => setTimeout(r, 500));
        const { data: branch } = await supabase.from("branches").select("id").eq("repo_id", repoData.id).eq("is_default", true).maybeSingle();
        if (branch) {
          const readmeContent = `# ${name}\n\n${description || "A new GutHib repository."}`;
          await supabase.from("repo_files").insert({
            repo_id: repoData.id,
            branch_id: branch.id,
            file_path: "README.md",
            file_name: "README.md",
            content: readmeContent,
            file_size: readmeContent.length,
            is_directory: false,
          });
          await supabase.from("commits").insert({
            repo_id: repoData.id,
            branch_id: branch.id,
            author_id: user.id,
            message: "Initial commit: add README.md",
          });
        }
      }

      navigate(`/${profile?.username}/${slug}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold mb-2">Create a new repository</h1>
        <p className="text-sm text-muted-foreground mb-8">A repository contains all project files, including the revision history.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Repository name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-project"
              required
              className="bg-secondary border-border max-w-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Great repository names are short and memorable.</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of your project"
              className="bg-secondary border-border"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium block">Visibility</label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/30">
              <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <BookOpen className="w-4 h-4" /> Public
                </div>
                <p className="text-xs text-muted-foreground">Anyone can see this repository.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/30">
              <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <BookOpen className="w-4 h-4" /> Private
                </div>
                <p className="text-xs text-muted-foreground">Only you can see this repository.</p>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/30">
            <input type="checkbox" checked={initReadme} onChange={(e) => setInitReadme(e.target.checked)} className="rounded" />
            <div>
              <span className="font-medium text-sm">Add a README file</span>
              <p className="text-xs text-muted-foreground">This will create a default README.md in your repository.</p>
            </div>
          </label>

          <Button variant="gh-primary" className="h-10" disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create repository"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default NewRepo;
