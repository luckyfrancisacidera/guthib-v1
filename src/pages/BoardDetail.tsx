import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Flag, Trash2, GitBranch, Zap, Trophy, Upload, Eye, Lock, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import TaskSubmissionPanel from "@/components/TaskSubmissionPanel";

const DIFFICULTY_CONFIG: Record<string, { label: string; min: number; max: number; default: number; color: string }> = {
  easy: { label: "Easy", min: 1, max: 10, default: 5, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  medium: { label: "Medium", min: 11, max: 20, default: 15, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  hard: { label: "Hard", min: 20, max: 40, default: 30, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  urgent: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  in_review: "bg-amber-500/20 text-amber-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

const LABEL_COLORS = ["bg-blue-500/20 text-blue-300", "bg-green-500/20 text-green-300", "bg-pink-500/20 text-pink-300", "bg-yellow-500/20 text-yellow-300"];

const BoardDetail = () => {
  const { boardId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionCounts, setSubmissionCounts] = useState<Map<string, number>>(new Map());

  // Repos for task linking
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [repoMap, setRepoMap] = useState<Map<string, { name: string; ownerUsername: string }>>(new Map());

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskLabels, setTaskLabels] = useState("");
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>();
  const [taskRepoId, setTaskRepoId] = useState("");
  const [taskXpReward, setTaskXpReward] = useState("15");
  const [taskDifficulty, setTaskDifficulty] = useState("medium");
  const [xpError, setXpError] = useState("");
  const [saving, setSaving] = useState(false);
  const [taskVisibility, setTaskVisibility] = useState("private");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Task detail panel
  const [detailTask, setDetailTask] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    const [{ data: b }, { data: ts }] = await Promise.all([
      supabase.from("task_boards").select("*").eq("id", boardId).single(),
      supabase.from("tasks").select("*").eq("board_id", boardId).order("created_at", { ascending: false }),
    ]);
    setBoard(b);
    setTasks(ts || []);
    setLoading(false);

    // Build repo map
    const repoIds = [...new Set((ts || []).map((t: any) => t.repo_id).filter(Boolean))];
    if (repoIds.length > 0) {
      const { data: repos } = await supabase.from("repositories").select("id, name, owner_id").in("id", repoIds);
      if (repos && repos.length > 0) {
        const ownerIds = [...new Set(repos.map((r) => r.owner_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ownerIds);
        const pMap = new Map((profiles || []).map((p) => [p.id, p.username]));
        const map = new Map<string, { name: string; ownerUsername: string }>();
        repos.forEach((r) => map.set(r.id, { name: r.name, ownerUsername: pMap.get(r.owner_id) || "" }));
        setRepoMap(map);
      }
    }

    // Fetch submission counts per task
    if (ts && ts.length > 0) {
      const taskIds = ts.map((t: any) => t.id);
      const { data: subs } = await supabase
        .from("task_submissions")
        .select("task_id")
        .in("task_id", taskIds);
      const counts = new Map<string, number>();
      (subs || []).forEach((s: any) => counts.set(s.task_id, (counts.get(s.task_id) || 0) + 1));
      setSubmissionCounts(counts);
    }
  }, [boardId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  useEffect(() => {
    if (!user) return;
    supabase.from("repositories").select("id, name").eq("owner_id", user.id).order("name").then(({ data }) => {
      setUserRepos(data || []);
    });
  }, [user]);

  const isCreator = user?.id === board?.owner_id;

  const openNewTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("medium");
    setTaskLabels("");
    setTaskDueDate(undefined);
    setTaskRepoId("");
    setTaskXpReward("15");
    setTaskDifficulty("medium");
    setXpError("");
    setTaskVisibility("private");
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskPriority(task.priority);
    setTaskLabels((task.labels || []).join(", "));
    setTaskDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setTaskRepoId(task.repo_id || "");
    setTaskXpReward(String(task.xp_reward || 15));
    setTaskDifficulty(task.difficulty || "medium");
    setXpError("");
    setTaskVisibility(task.visibility || "private");
    setTaskDialogOpen(true);
  };

  const openTaskDetail = (task: any) => {
    setDetailTask(task);
    setDetailDialogOpen(true);
  };

  const saveTask = async () => {
    // Validate XP against difficulty
    const xp = parseInt(taskXpReward) || 0;
    const diff = DIFFICULTY_CONFIG[taskDifficulty];
    if (xp < diff.min || xp > diff.max) {
      setXpError(`${diff.label} missions require ${diff.min}–${diff.max} XP`);
      return;
    }
    setXpError("");

    if (!user || !taskTitle.trim() || !taskRepoId) return;
    setSaving(true);

    // We need a column_id for the DB constraint - get or create one
    let columnId = editingTask?.column_id;
    if (!columnId) {
      const { data: cols } = await supabase
        .from("task_board_columns")
        .select("id")
        .eq("board_id", boardId!)
        .limit(1);
      if (cols && cols.length > 0) {
        columnId = cols[0].id;
      } else {
        // Create a default column
        const { data: newCol } = await supabase
          .from("task_board_columns")
          .insert({ board_id: boardId!, name: "Missions", position: 0 })
          .select()
          .single();
        columnId = newCol?.id;
      }
    }

    const labels = taskLabels.split(",").map(l => l.trim()).filter(Boolean);
    const payload: any = {
      title: taskTitle.trim(),
      description: taskDesc.trim() || null,
      priority: taskPriority,
      labels,
      due_date: taskDueDate ? format(taskDueDate, "yyyy-MM-dd") : null,
      repo_id: taskRepoId,
      xp_reward: xp,
      difficulty: taskDifficulty,
      visibility: taskVisibility,
    };

    if (editingTask) {
      // Don't allow editing completed/accepted tasks
      if (editingTask.status === "accepted" || editingTask.status === "completed") {
        toast.error("Cannot edit a completed mission");
        setSaving(false);
        return;
      }
      await supabase.from("tasks").update(payload).eq("id", editingTask.id);
      toast.success("Mission updated");
    } else {
      await supabase.from("tasks").insert({
        ...payload,
        board_id: boardId!,
        creator_id: user.id,
        column_id: columnId,
        position: 0,
        status: "open",
      });
      toast.success("Mission created");
      // NO XP for creating tasks - only for completing them
    }

    setSaving(false);
    setTaskDialogOpen(false);
    fetchBoard();
  };

  const confirmDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === "accepted" || task?.status === "completed") {
      toast.error("Cannot delete a completed mission");
      return;
    }
    setDeleteTaskId(taskId);
    setDeleteDialogOpen(true);
  };

  const executeDeleteTask = async () => {
    if (!deleteTaskId) return;
    await supabase.from("tasks").delete().eq("id", deleteTaskId);
    toast.success("Mission deleted");
    setDeleteTaskId(null);
    setDeleteDialogOpen(false);
    fetchBoard();
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div></AppLayout>;
  if (!board) return <AppLayout><div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Board not found</div></AppLayout>;

  const openTasks = tasks.filter(t => t.status === "open" || t.status === "in_review" || t.status === "declined");
  const completedTasks = tasks.filter(t => t.status === "accepted" || t.status === "completed");

  return (
    <AppLayout>
      <div className="max-w-[960px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h1 className="font-display text-xl font-bold">{board.name}</h1>
              </div>
              {board.description && <p className="text-sm text-muted-foreground mt-1">{board.description}</p>}
            </div>
            {isCreator && (
              <Button variant="gh-primary" size="sm" onClick={openNewTask}>
                <Plus className="w-4 h-4 mr-1" />Post Mission
              </Button>
            )}
          </div>
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
            <span>{openTasks.length} active</span>
            <span>•</span>
            <span>{completedTasks.length} completed</span>
          </div>
        </div>

        {/* Active Missions */}
        {openTasks.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Active Missions
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {openTasks.map((task) => {
                const repo = repoMap.get(task.repo_id);
                const taskIsCreator = user?.id === task.creator_id;
                const subCount = submissionCounts.get(task.id) || 0;
                const canSubmit = user && user.id !== task.creator_id && task.status !== "accepted" && task.status !== "completed";

                return (
                  <div key={task.id}
                    className="bg-background border border-border rounded-xl p-4 hover:border-accent/50 transition-colors relative">
                    {/* XP Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold text-xs">
                        <Zap className="w-3 h-3 mr-0.5" />{task.xp_reward || 10} XP
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${DIFFICULTY_CONFIG[task.difficulty || "medium"]?.color}`}>
                        {DIFFICULTY_CONFIG[task.difficulty || "medium"]?.label}
                      </Badge>
                    </div>

                    {/* Labels */}
                    {task.labels?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {task.labels.map((l: string, i: number) => (
                          <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded-full ${LABEL_COLORS[i % LABEL_COLORS.length]}`}>{l}</span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-sm font-semibold text-foreground mb-1 pr-16">{task.title}</h3>

                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                    )}

                    {/* Status + Visibility */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[task.status] || STATUS_STYLES.open}`}>
                        {task.status === "in_review" ? "In Review" : task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
                      </Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      <Badge variant="outline" className="text-[9px] gap-0.5">
                        {task.visibility === "public" ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        {task.visibility === "public" ? "Public" : "Private"}
                      </Badge>
                    </div>

                    {/* Repo link */}
                    {repo && (
                      <Link
                        to={`/${repo.ownerUsername}/${repo.name}`}
                        className="flex items-center gap-1 text-[10px] text-accent hover:underline mb-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitBranch className="w-2.5 h-2.5" />
                        {repo.ownerUsername}/{repo.name}
                      </Link>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {task.due_date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />{format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Upload className="w-2.5 h-2.5" />{subCount} submission{subCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openTaskDetail(task)}>
                          <Eye className="w-3 h-3 mr-1" />View
                        </Button>
                        {canSubmit && (
                          <Button variant="gh-primary" size="sm" className="h-7 text-xs" onClick={() => openTaskDetail(task)}>
                            <Upload className="w-3 h-3 mr-1" />Submit
                          </Button>
                        )}
                        {taskIsCreator && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={async () => {
                                const newVis = task.visibility === "public" ? "private" : "public";
                                await supabase.from("tasks").update({ visibility: newVis }).eq("id", task.id);
                                toast.success(`Mission set to ${newVis}`);
                                fetchBoard();
                              }}
                              title={`Toggle to ${task.visibility === "public" ? "private" : "public"}`}
                            >
                              {task.visibility === "public" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditTask(task)}>
                              <Flag className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => confirmDeleteTask(task.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Missions */}
        {completedTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">✅ Completed Missions</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {completedTasks.map((task) => {
                const repo = repoMap.get(task.repo_id);
                return (
                  <div key={task.id}
                    className="bg-background/50 border border-border/50 rounded-xl p-4 opacity-70">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground line-through">{task.title}</h3>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />{task.xp_reward || 10} XP
                      </Badge>
                    </div>
                    {repo && (
                      <Link to={`/${repo.ownerUsername}/${repo.name}`}
                        className="flex items-center gap-1 text-[10px] text-accent hover:underline mt-1">
                        <GitBranch className="w-2.5 h-2.5" />{repo.ownerUsername}/{repo.name}
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] mt-2 px-2" onClick={() => openTaskDetail(task)}>
                      View Details
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No missions yet. {isCreator ? "Post one to get started!" : "Check back later!"}</p>
          </div>
        )}
      </div>

      {/* Task detail / submissions dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              {detailTask?.title}
            </DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4 pt-2">
              {/* XP reward */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold">
                  <Zap className="w-3.5 h-3.5 mr-1" />{detailTask.xp_reward || 10} XP Reward
                </Badge>
                <Badge variant="outline" className={DIFFICULTY_CONFIG[detailTask.difficulty || "medium"]?.color}>
                  {DIFFICULTY_CONFIG[detailTask.difficulty || "medium"]?.label}
                </Badge>
                {detailTask.xp_awarded && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">XP Awarded</Badge>
                )}
              </div>

              {detailTask.description && (
                <p className="text-sm text-muted-foreground">{detailTask.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[detailTask.priority]}`}>{detailTask.priority}</span>
                {detailTask.due_date && (
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" /> {format(new Date(detailTask.due_date), "PPP")}
                  </span>
                )}
                {repoMap.get(detailTask.repo_id) && (
                  <Link to={`/${repoMap.get(detailTask.repo_id)!.ownerUsername}/${repoMap.get(detailTask.repo_id)!.name}`}
                    className="text-accent hover:underline flex items-center gap-0.5">
                    <GitBranch className="w-3 h-3" />
                    {repoMap.get(detailTask.repo_id)!.ownerUsername}/{repoMap.get(detailTask.repo_id)!.name}
                  </Link>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <TaskSubmissionPanel
                  task={detailTask}
                  isCreator={user?.id === detailTask.creator_id}
                  onStatusChange={() => {
                    fetchBoard();
                    supabase.from("tasks").select("*").eq("id", detailTask.id).single().then(({ data }) => {
                      if (data) setDetailTask(data);
                    });
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task create/edit dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Mission" : "Post New Mission"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="Mission title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <Textarea placeholder="Describe the mission..." value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger><Flag className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={taskDifficulty} onValueChange={(v) => {
                setTaskDifficulty(v);
                const cfg = DIFFICULTY_CONFIG[v];
                setTaskXpReward(String(cfg.default));
                setXpError("");
              }}>
                <SelectTrigger><Zap className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">🟢 Easy (1–10 XP)</SelectItem>
                  <SelectItem value="medium">🟡 Medium (11–20 XP)</SelectItem>
                  <SelectItem value="hard">🔴 Hard (20–40 XP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                XP Reward ({DIFFICULTY_CONFIG[taskDifficulty].min}–{DIFFICULTY_CONFIG[taskDifficulty].max} for {DIFFICULTY_CONFIG[taskDifficulty].label})
              </label>
              <Input
                type="number"
                min={DIFFICULTY_CONFIG[taskDifficulty].min}
                max={DIFFICULTY_CONFIG[taskDifficulty].max}
                placeholder="XP Reward"
                value={taskXpReward}
                onChange={(e) => {
                  setTaskXpReward(e.target.value);
                  const v = parseInt(e.target.value);
                  const cfg = DIFFICULTY_CONFIG[taskDifficulty];
                  if (v && (v < cfg.min || v > cfg.max)) {
                    setXpError(`${cfg.label} missions require ${cfg.min}–${cfg.max} XP`);
                  } else {
                    setXpError("");
                  }
                }}
                className={cn("h-10", xpError && "border-destructive")}
              />
              {xpError && <p className="text-[11px] text-destructive mt-1">{xpError}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Linked Repository *</label>
              <Select value={taskRepoId} onValueChange={setTaskRepoId}>
                <SelectTrigger>
                  <GitBranch className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {userRepos.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {userRepos.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">No repositories found. Create one first.</p>
              )}
            </div>
            <Input placeholder="Labels (comma-separated)" value={taskLabels} onChange={(e) => setTaskLabels(e.target.value)} />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Visibility</label>
              <Select value={taskVisibility} onValueChange={setTaskVisibility}>
                <SelectTrigger>
                  {taskVisibility === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" />Private</span></SelectItem>
                  <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" />Public</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !taskDueDate && "text-muted-foreground")}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {taskDueDate ? format(taskDueDate, "PPP") : "Set due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={taskDueDate} onSelect={setTaskDueDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Button onClick={saveTask} disabled={saving || !taskTitle.trim() || !taskRepoId || !!xpError} className="w-full" variant="gh-primary">
              {saving ? "Saving..." : editingTask ? "Update Mission" : "Post Mission"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete mission confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the mission and all its submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={executeDeleteTask}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default BoardDetail;
