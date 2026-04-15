import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, LayoutDashboard, Users, GitBranch, Calendar, Lock, Globe, Building2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const DEFAULT_COLUMNS = ["Missions"];

const TaskBoards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [boardType, setBoardType] = useState("personal");
  const [visibility, setVisibility] = useState("private");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [deleteBoardDialogOpen, setDeleteBoardDialogOpen] = useState(false);

  // Orgs
  const [orgs, setOrgs] = useState<any[]>([]);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgMemberUsername, setOrgMemberUsername] = useState("");
  const [orgMembers, setOrgMembers] = useState<{ id: string; username: string }[]>([]);
  const [creatingOrg, setCreatingOrg] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("task_boards")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) console.error("fetchBoards error:", error);
    setBoards(data || []);
    setLoading(false);
  }, [user]);

  const fetchOrgs = useCallback(async () => {
    if (!user) return;
    // Fetch orgs where user is owner or member
    const { data } = await supabase.from("organizations").select("*").order("name");
    setOrgs(data || []);
  }, [user]);

  useEffect(() => { fetchBoards(); fetchOrgs(); }, [fetchBoards, fetchOrgs]);

  const addOrgMember = async () => {
    if (!orgMemberUsername.trim()) return;
    const uname = orgMemberUsername.trim().toLowerCase();
    if (orgMembers.some(m => m.username.toLowerCase() === uname)) {
      toast.error("Member already added");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("id, username").eq("username", uname).maybeSingle();
    if (!profile) { toast.error("User not found"); return; }
    if (profile.id === user?.id) { toast.error("You are automatically the owner"); return; }
    setOrgMembers(prev => [...prev, { id: profile.id, username: profile.username }]);
    setOrgMemberUsername("");
  };

  const createOrg = async () => {
    if (!user || !orgName.trim()) return;
    if (orgMembers.length === 0) { toast.error("Add at least one member"); return; }
    setCreatingOrg(true);
    try {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim(), description: orgDesc.trim() || null, owner_id: user.id })
        .select().single();
      if (error || !org) { toast.error(error?.message || "Failed to create org"); setCreatingOrg(false); return; }

      // Add owner as member
      await supabase.from("org_members").insert({ org_id: org.id, user_id: user.id, role: "owner" });
      // Add other members
      for (const m of orgMembers) {
        await supabase.from("org_members").insert({ org_id: org.id, user_id: m.id, role: "member" });
      }

      toast.success("Organization created!");
      setShowCreateOrg(false);
      setOrgName("");
      setOrgDesc("");
      setOrgMembers([]);
      setOrgMemberUsername("");
      await fetchOrgs();
      setSelectedOrgId(org.id);
    } catch (err: any) {
      toast.error(err.message || "Unexpected error");
    }
    setCreatingOrg(false);
  };

  const createBoard = async () => {
    if (!user || !name.trim()) return;
    if (visibility === "organization" && !selectedOrgId) {
      toast.error("Select an organization");
      return;
    }
    setCreating(true);
    try {
      const { data: board, error } = await supabase
        .from("task_boards")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          board_type: boardType,
          owner_id: user.id,
          visibility,
          org_id: visibility === "organization" ? selectedOrgId : null,
        })
        .select().single();
      if (error) { toast.error(`Failed to create board: ${error.message}`); setCreating(false); return; }
      if (!board) { toast.error("Board was not returned after creation"); setCreating(false); return; }

      const cols = DEFAULT_COLUMNS.map((col, i) => ({ board_id: board.id, name: col, position: i }));
      const { error: colError } = await supabase.from("task_board_columns").insert(cols);
      if (colError) toast.error(`Board created but columns failed: ${colError.message}`);

      toast.success("Board created!");
      setOpen(false);
      setName("");
      setDescription("");
      setBoardType("personal");
      setVisibility("private");
      setSelectedOrgId("");
      setCreating(false);
      navigate(`/boards/${board.id}`);
    } catch (err: any) {
      toast.error(err.message || "Unexpected error");
      setCreating(false);
    }
  };

  const typeIcon = (t: string) => {
    if (t === "team") return <Users className="w-4 h-4 text-muted-foreground" />;
    if (t === "repo") return <GitBranch className="w-4 h-4 text-muted-foreground" />;
    return <LayoutDashboard className="w-4 h-4 text-muted-foreground" />;
  };

  const visibilityBadge = (v: string) => {
    if (v === "public") return <Badge variant="secondary" className="gap-1 text-[10px]"><Globe className="w-3 h-3" />Public</Badge>;
    if (v === "organization") return <Badge variant="secondary" className="gap-1 text-[10px]"><Building2 className="w-3 h-3" />Org</Badge>;
    return <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="w-3 h-3" />Private</Badge>;
  };

  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Task Boards</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gh-primary" size="sm"><Plus className="w-4 h-4 mr-1" />New Board</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Task Board</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Board name" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

                <Select value={boardType} onValueChange={setBoardType}>
                  <SelectTrigger><SelectValue placeholder="Board type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="repo">Repository</SelectItem>
                  </SelectContent>
                </Select>

                {/* Visibility */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visibility</label>
                  <Select value={visibility} onValueChange={(v) => { setVisibility(v); if (v !== "organization") setSelectedOrgId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" />Private</span></SelectItem>
                      <SelectItem value="organization"><span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />Organization</span></SelectItem>
                      <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" />Public</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Org picker */}
                {visibility === "organization" && (
                  <div className="space-y-3 border border-border rounded-lg p-3">
                    {orgs.length > 0 ? (
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                        <SelectContent>
                          {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">You don't belong to any organizations yet.</p>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCreateOrg(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Create Organization
                    </Button>
                  </div>
                )}

                <Button onClick={createBoard} disabled={creating || !name.trim()} className="w-full" variant="gh-primary">
                  {creating ? "Creating..." : "Create Board"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Create Org Dialog */}
        <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Organization name" value={orgName} onChange={e => setOrgName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={orgDesc} onChange={e => setOrgDesc(e.target.value)} rows={2} />
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Members (at least 1 required)</label>
                <div className="flex gap-2">
                  <Input placeholder="Username" value={orgMemberUsername} onChange={e => setOrgMemberUsername(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOrgMember(); } }} />
                  <Button variant="outline" size="sm" onClick={addOrgMember}>Add</Button>
                </div>
                {orgMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {orgMembers.map(m => (
                      <Badge key={m.id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setOrgMembers(prev => prev.filter(x => x.id !== m.id))}>
                        {m.username} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={createOrg} disabled={creatingOrg || !orgName.trim() || orgMembers.length === 0} className="w-full" variant="gh-primary">
                {creatingOrg ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />)}</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No task boards yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {boards.map((board) => {
              const isBoardOwner = user?.id === board.owner_id;
              return (
                <div key={board.id} className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors">
                  <Link to={`/boards/${board.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    {typeIcon(board.board_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">{board.name}</p>
                        {visibilityBadge(board.visibility || "private")}
                      </div>
                      {board.description && <p className="text-xs text-muted-foreground truncate">{board.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize px-2 py-0.5 bg-secondary rounded-full">{board.board_type}</span>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(board.updated_at), { addSuffix: true })}</span>
                    </div>
                  </Link>

                  {isBoardOwner && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={board.visibility === "public"}
                          onCheckedChange={async (checked) => {
                            const newVis = checked ? "public" : "private";
                            await supabase.from("task_boards").update({ visibility: newVis }).eq("id", board.id);
                            toast.success(`Board set to ${newVis}`);
                            fetchBoards();
                          }}
                          className="scale-75"
                        />
                        <span className="text-[10px] text-muted-foreground w-10">{board.visibility === "public" ? "Public" : "Private"}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeletingBoardId(board.id);
                          setDeleteBoardDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Delete board confirmation */}
        <AlertDialog open={deleteBoardDialogOpen} onOpenChange={setDeleteBoardDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this board?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the board, all its missions, and all submissions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!deletingBoardId) return;
                  const { error } = await supabase.from("task_boards").delete().eq("id", deletingBoardId);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    toast.success("Board deleted");
                    fetchBoards();
                  }
                  setDeletingBoardId(null);
                  setDeleteBoardDialogOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default TaskBoards;
