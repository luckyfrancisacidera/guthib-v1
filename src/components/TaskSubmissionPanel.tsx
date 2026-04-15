import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle2, XCircle, Send, FileText, MessageSquare, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  declined: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface TaskSubmissionPanelProps {
  task: any;
  isCreator: boolean;
  onStatusChange: () => void;
}

interface Submission {
  id: string;
  task_id: string;
  submitter_id: string;
  notes: string | null;
  file_urls: string[];
  status: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  submitter_username?: string;
  reviewer_username?: string;
}

const TaskSubmissionPanel = ({ task, isCreator, onStatusChange }: TaskSubmissionPanelProps) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.status === "accepted" || task.status === "completed";
  const hasAccepted = submissions.some(s => s.status === "accepted");

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from("task_submissions")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setSubmissions([]);
      return;
    }

    const userIds = [...new Set([
      ...data.map((s: any) => s.submitter_id),
      ...data.filter((s: any) => s.reviewed_by).map((s: any) => s.reviewed_by),
    ])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const pMap = new Map((profiles || []).map((p) => [p.id, p.username]));

    setSubmissions(
      data.map((s: any) => ({
        ...s,
        submitter_username: pMap.get(s.submitter_id) || "unknown",
        reviewer_username: s.reviewed_by ? pMap.get(s.reviewed_by) || "unknown" : undefined,
      }))
    );
  };

  useEffect(() => {
    fetchSubmissions();
  }, [task.id]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const fileUrls: string[] = [];
    for (const f of files) {
      const path = `submissions/${task.id}/${Date.now()}_${f.name}`;
      const { error } = await supabase.storage.from("repo-files").upload(path, f, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("repo-files").getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from("task_submissions").insert({
      task_id: task.id,
      submitter_id: user.id,
      notes: notes.trim() || null,
      file_urls: fileUrls,
    });

    if (error) {
      toast.error(error.message);
    } else {
      await supabase.from("tasks").update({ status: "in_review" }).eq("id", task.id);
      toast.success("Solution submitted!");
      onStatusChange();
    }

    setSubmitting(false);
    setSubmitDialogOpen(false);
    setNotes("");
    setFiles([]);
    fetchSubmissions();
  };

  const handleReview = async (decision: "accepted" | "declined") => {
    if (!user || !reviewingSubmission) return;

    // Anti-exploit: check if task already has XP awarded
    if (decision === "accepted" && task.xp_awarded) {
      toast.error("XP already awarded for this mission. Cannot approve again.");
      setReviewDialogOpen(false);
      return;
    }

    // Anti-exploit: don't allow approving if already accepted
    if (decision === "accepted" && hasAccepted) {
      toast.error("A solution has already been accepted for this mission.");
      setReviewDialogOpen(false);
      return;
    }

    // Anti-exploit: creator cannot approve their own submission
    if (decision === "accepted" && reviewingSubmission.submitter_id === task.creator_id) {
      toast.error("Cannot approve your own submission.");
      setReviewDialogOpen(false);
      return;
    }

    await supabase.from("task_submissions").update({
      status: decision,
      review_note: reviewNote.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", reviewingSubmission.id);

    if (decision === "accepted") {
      const xpAmount = task.xp_reward || 10;

      // Use server-side SECURITY DEFINER function to award XP
      // This bypasses RLS so the creator can grant XP to the submitter
      const { error: xpError } = await supabase.rpc("award_task_xp", {
        _task_id: task.id,
        _submitter_id: reviewingSubmission.submitter_id,
        _xp_amount: xpAmount,
      });

      if (xpError) {
        toast.error(xpError.message);
        setReviewDialogOpen(false);
        return;
      }

      toast.success(`✅ Solution accepted! ${xpAmount} XP awarded to contributor`);
    } else {
      await supabase.from("tasks").update({ status: "open" }).eq("id", task.id);
      toast.success("Solution declined");
    }

    onStatusChange();
    setReviewDialogOpen(false);
    setReviewingSubmission(null);
    setReviewNote("");
    fetchSubmissions();
  };

  const openReview = (sub: Submission) => {
    setReviewingSubmission(sub);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  // Can submit if: logged in, not the creator, task not completed, and no accepted submission
  const canSubmit = user && user.id !== task.creator_id && !isCompleted && !hasAccepted;

  // For display: if accepted, show accepted first, then hide others from main view
  const acceptedSub = submissions.find(s => s.status === "accepted");
  const pendingSubs = submissions.filter(s => s.status !== "accepted");
  const displaySubs = isCompleted && acceptedSub ? [acceptedSub] : submissions;

  return (
    <div className="space-y-3">
      {/* Task status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[task.status] || "bg-secondary text-muted-foreground"}`}>
          {task.status === "in_review" ? "In Review" : task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
        </Badge>
        {task.xp_awarded && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
            <Zap className="w-2.5 h-2.5 mr-0.5" />XP Awarded
          </Badge>
        )}
      </div>

      {/* Submit solution button */}
      {canSubmit && (
        <Button variant="gh-primary" size="sm" className="w-full" onClick={() => setSubmitDialogOpen(true)}>
          <Send className="w-3.5 h-3.5 mr-1" /> Submit Solution
        </Button>
      )}

      {isCompleted && !canSubmit && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
          ✅ This mission is complete. A solution has been accepted.
        </div>
      )}

      {/* Submissions list */}
      {displaySubs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {isCompleted ? "Accepted Solution" : `Submissions (${submissions.length})`}
          </p>
          {displaySubs.map((sub) => (
            <div key={sub.id} className={`border rounded-lg p-3 space-y-2 ${
              sub.status === "accepted" 
                ? "border-emerald-500/30 bg-emerald-500/5" 
                : "border-border bg-secondary/10"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-medium">
                    {sub.submitter_username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{sub.submitter_username}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[sub.status] || ""}`}>
                  {sub.status}
                </Badge>
              </div>

              {sub.notes && (
                <p className="text-xs text-muted-foreground bg-background rounded p-2">{sub.notes}</p>
              )}

              {sub.file_urls && sub.file_urls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sub.file_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" /> File {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {/* Review note */}
              {sub.review_note && (
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      Review by {sub.reviewer_username}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground bg-background rounded p-2">{sub.review_note}</p>
                </div>
              )}

              {/* Review actions - only for creator, only for submitted status, only if no accepted solution yet */}
              {isCreator && sub.status === "submitted" && !hasAccepted && !task.xp_awarded && (
                <div className="flex gap-2 pt-1">
                  <Button variant="gh-primary" size="sm" className="h-7 text-xs flex-1" onClick={() => openReview(sub)}>
                    Review
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Show other submissions collapsed when task is completed */}
          {isCompleted && pendingSubs.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">{pendingSubs.length} other submission{pendingSubs.length !== 1 ? "s" : ""}</summary>
              <div className="space-y-2 mt-2">
                {pendingSubs.map((sub) => (
                  <div key={sub.id} className="border border-border/50 rounded-lg p-2 opacity-60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{sub.submitter_username}</span>
                      <Badge variant="outline" className="text-[8px]">{sub.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Submit solution dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Solution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mission:</span>
              <span className="font-medium text-foreground text-sm">{task.title}</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                <Zap className="w-2.5 h-2.5 mr-0.5" />{task.xp_reward || 10} XP
              </Badge>
            </div>
            <Textarea
              placeholder="Describe your solution, approach, or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <div>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Attach files
              </Button>
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</p>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={submitting || (!notes.trim() && files.length === 0)} className="w-full" variant="gh-primary">
              {submitting ? "Submitting..." : "Submit Solution"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          {reviewingSubmission && (
            <div className="space-y-4 pt-2">
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium">From: {reviewingSubmission.submitter_username}</p>
                {reviewingSubmission.notes && (
                  <p className="text-sm">{reviewingSubmission.notes}</p>
                )}
                {reviewingSubmission.file_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reviewingSubmission.file_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-0.5">
                        <FileText className="w-3 h-3" /> File {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <Textarea
                placeholder="Leave a review note (optional)..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleReview("declined")}>
                  <XCircle className="w-4 h-4 mr-1" /> Decline
                </Button>
                <Button variant="gh-primary" onClick={() => handleReview("accepted")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskSubmissionPanel;
