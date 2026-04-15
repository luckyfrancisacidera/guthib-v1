import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Pencil, Eye, Save } from "lucide-react";
import DOMPurify from "dompurify";

interface ReadmeEditorProps {
  repoId: string;
  branchId: string | null;
  isOwner: boolean;
  userId?: string;
}

const ReadmeEditor = ({ repoId, branchId, isOwner, userId }: ReadmeEditorProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId || !branchId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("repo_files")
        .select("id, content")
        .eq("repo_id", repoId)
        .eq("branch_id", branchId)
        .eq("file_name", "README.md")
        .maybeSingle();
      if (data) {
        setContent(data.content);
        setFileId(data.id);
        setDraft(data.content || "");
      } else {
        setContent(null);
        setFileId(null);
        setDraft("");
      }
    };
    fetch();
  }, [repoId, branchId]);

  const handleSave = async () => {
    if (!branchId || !userId) return;
    setSaving(true);
    try {
      if (fileId) {
        await supabase.from("repo_files").update({
          content: draft,
          file_size: draft.length,
          updated_at: new Date().toISOString(),
        }).eq("id", fileId);
      } else {
        const { data } = await supabase.from("repo_files").insert({
          repo_id: repoId,
          branch_id: branchId,
          file_path: "README.md",
          file_name: "README.md",
          content: draft,
          file_size: draft.length,
          is_directory: false,
        }).select("id").single();
        if (data) setFileId(data.id);
      }

      // Create commit for the README change
      const { data: commit } = await supabase.from("commits").insert({
        repo_id: repoId,
        branch_id: branchId,
        author_id: userId,
        message: fileId ? "Update README.md" : "Create README.md",
      }).select().single();

      if (commit) {
        await supabase.from("commit_files").insert({
          commit_id: commit.id,
          file_path: "README.md",
          file_name: "README.md",
          content: draft,
          file_size: draft.length,
          action: fileId ? "modified" : "added",
        });
      }

      setContent(draft);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  // Simple markdown renderer
  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-secondary rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, '<br />');
  };

  if (content === null && !editing) {
    if (!isOwner) return null;
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center mt-4">
        <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">No README yet</p>
        <Button variant="gh-outline" size="sm" onClick={() => { setEditing(true); setDraft("# Project Name\n\nA brief description of your project."); }}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Add a README
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg mt-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border">
        <span className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> README.md
        </span>
        {isOwner && !editing && (
          <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setDraft(content || ""); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {editing ? (
        <div>
          <div className="flex gap-1 px-4 pt-2">
            <Button variant={preview ? "ghost" : "secondary"} size="sm" onClick={() => setPreview(false)} className="text-xs h-7">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
            <Button variant={preview ? "secondary" : "ghost"} size="sm" onClick={() => setPreview(true)} className="text-xs h-7">
              <Eye className="w-3 h-3 mr-1" /> Preview
            </Button>
          </div>
          {preview ? (
            <div className="p-4 prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(draft)) }} />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="border-0 rounded-none min-h-[200px] font-mono text-sm focus-visible:ring-0 resize-y"
              rows={12}
            />
          )}
          <div className="flex gap-2 px-4 py-2 border-t border-border bg-secondary/10">
            <Button variant="gh-primary" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving..." : "Commit changes"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="p-4 prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(content || "")) }} />
      )}
    </div>
  );
};

export default ReadmeEditor;
