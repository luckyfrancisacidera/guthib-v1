import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Star, GitFork, Code, CircleDot, GitPullRequest, MessageSquare,
  File, Folder, Upload, Download, GitBranch, History, ChevronDown,
  Check, X, GitMerge
} from "lucide-react";
import ReadmeEditor from "@/components/ReadmeEditor";
import RepoCollaborators from "@/components/RepoCollaborators";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useGitOps, type Branch, type RepoFile } from "@/hooks/useGitOps";
import { formatDistanceToNow } from "date-fns";

interface RepoData {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  language: string | null;
  default_branch: string;
  stars_count: number;
  forks_count: number;
  owner_id: string;
  created_at: string;
}

const RepoDetail = () => {
  const { username, repoName } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [starsCount, setStarsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"code" | "issues" | "prs" | "discussions" | "commits">("code");
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branch creation
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);

  // Commit message for uploads
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Download
  const [downloading, setDownloading] = useState(false);

  const git = useGitOps(repo?.id, user?.id);

  useEffect(() => {
    const fetchRepo = async () => {
      const { data: profile } = await supabase.from("profiles").select("id, username").eq("username", username).single();
      if (!profile) { setLoading(false); return; }
      setOwnerUsername(profile.username);

      const { data: repoData } = await supabase.from("repositories").select("*").eq("owner_id", profile.id).eq("name", repoName).single();
      if (!repoData) { setLoading(false); return; }
      setRepo(repoData as RepoData);
      setStarsCount(repoData.stars_count);

      const [{ data: issuesData }, { data: prsData }, { data: discsData }] = await Promise.all([
        supabase.from("issues").select("*, profiles(username)").eq("repo_id", repoData.id).order("created_at", { ascending: false }),
        supabase.from("pull_requests").select("*, profiles(username)").eq("repo_id", repoData.id).order("created_at", { ascending: false }),
        supabase.from("discussions").select("*, profiles(username)").eq("repo_id", repoData.id).order("created_at", { ascending: false }),
      ]);
      setIssues(issuesData || []);
      setPrs(prsData || []);
      setDiscussions(discsData || []);

      if (user) {
        const { data: star } = await supabase.from("repo_stars").select("id").eq("repo_id", repoData.id).eq("user_id", user.id).maybeSingle();
        setIsStarred(!!star);
      }
      setLoading(false);
    };
    fetchRepo();
  }, [username, repoName, user]);

  // Fetch branches once repo is loaded
  useEffect(() => {
    if (!repo) return;
    const init = async () => {
      const branchList = await git.fetchBranches();
      if (branchList && branchList.length > 0) {
        const def = branchList.find((b) => b.is_default) || branchList[0];
        await git.switchBranch(def);
      }
    };
    init();
  }, [repo?.id]);

  const toggleStar = async () => {
    if (!user || !repo) return;
    if (isStarred) {
      await supabase.from("repo_stars").delete().eq("repo_id", repo.id).eq("user_id", user.id);
      setStarsCount((c) => c - 1);
      await supabase.from("repositories").update({ stars_count: starsCount - 1 }).eq("id", repo.id);
    } else {
      await supabase.from("repo_stars").insert({ repo_id: repo.id, user_id: user.id });
      setStarsCount((c) => c + 1);
      await supabase.from("repositories").update({ stars_count: starsCount + 1 }).eq("id", repo.id);
    }
    setIsStarred(!isStarred);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setPendingFile(e.target.files[0]);
    setCommitMessage(`Add ${e.target.files[0].name}`);
    setCommitDialogOpen(true);
    e.target.value = "";
  };

  const handleCommitUpload = async () => {
    if (!pendingFile || !git.currentBranch) return;
    const result = await git.uploadFileWithCommit(pendingFile, git.currentBranch.id, commitMessage);
    if (result.error) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "File committed!" });
    }
    setCommitDialogOpen(false);
    setPendingFile(null);
    setCommitMessage("");
  };

  const handleCreateBranch = async () => {
    const result = await git.createBranch(newBranchName);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: `Branch '${newBranchName}' created` });
    }
    setBranchDialogOpen(false);
    setNewBranchName("");
  };

  const handleDownloadZip = async () => {
    if (!git.currentBranch || !repo) return;
    setDownloading(true);
    const result = await git.downloadAsZip(git.currentBranch.id, git.currentBranch.name, repo.name);
    if (result?.error) {
      toast({ title: "Download failed", description: result.error, variant: "destructive" });
    }
    setDownloading(false);
  };

  const handleMergePR = async (pr: any) => {
    if (!repo) return;
    const sourceBranch = git.branches.find((b) => b.name === pr.source_branch);
    const targetBranch = git.branches.find((b) => b.name === pr.target_branch);
    if (!sourceBranch || !targetBranch) {
      toast({ title: "Error", description: "Source or target branch not found", variant: "destructive" });
      return;
    }
    const result = await git.mergeBranch(sourceBranch.id, targetBranch.id, pr.id);
    if (result.error) {
      toast({ title: "Merge failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Pull request merged!" });
      // Refresh PRs
      const { data } = await supabase.from("pull_requests").select("*, profiles(username)").eq("repo_id", repo.id).order("created_at", { ascending: false });
      setPrs(data || []);
      // If viewing target branch, refresh files
      if (git.currentBranch?.id === targetBranch.id) {
        await git.fetchFiles(targetBranch.id);
        await git.fetchCommits(targetBranch.id);
      }
    }
  };

  const handleRejectPR = async (prId: string) => {
    await supabase.from("pull_requests").update({ status: "closed" }).eq("id", prId);
    const { data } = await supabase.from("pull_requests").select("*, profiles(username)").eq("repo_id", repo!.id).order("created_at", { ascending: false });
    setPrs(data || []);
    toast({ title: "Pull request closed" });
  };

  const isOwner = user?.id === repo?.owner_id;
  const [isCollaborator, setIsCollaborator] = useState(false);

  useEffect(() => {
    if (!user || !repo || isOwner) return;
    supabase.from("repo_collaborators").select("id").eq("repo_id", repo.id).eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setIsCollaborator(!!data);
    });
  }, [user, repo, isOwner]);

  const canUpload = isOwner || isCollaborator;

  if (loading) return <AppLayout><div className="max-w-[1280px] mx-auto px-4 py-8"><div className="animate-pulse h-48 bg-secondary rounded-lg" /></div></AppLayout>;
  if (!repo) return <AppLayout><div className="max-w-[1280px] mx-auto px-4 py-16 text-center"><h1 className="font-display text-2xl font-bold mb-2">Repository not found</h1></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-6">
        {/* Repo header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link to={`/${ownerUsername}`} className="text-accent hover:underline">{ownerUsername}</Link>
              <span>/</span>
              <span className="font-semibold text-foreground">{repo.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border">{repo.is_public ? "Public" : "Private"}</span>
            </div>
            {repo.description && <p className="text-sm text-muted-foreground">{repo.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="gh-outline" size="sm" onClick={toggleStar} disabled={!user}>
              <Star className={`w-4 h-4 mr-1 ${isStarred ? "fill-gh-yellow text-gh-yellow" : ""}`} />
              {isStarred ? "Starred" : "Star"} <span className="ml-1 text-xs">{starsCount}</span>
            </Button>
            <Button variant="gh-outline" size="sm" onClick={handleDownloadZip} disabled={downloading || git.files.length === 0}>
              <Download className="w-4 h-4 mr-1" /> {downloading ? "Zipping..." : "Download ZIP"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {[
            { id: "code" as const, icon: Code, label: "Code" },
            { id: "commits" as const, icon: History, label: "Commits", count: git.commits.length },
            { id: "issues" as const, icon: CircleDot, label: "Issues", count: issues.filter((i) => i.status === "open").length },
            { id: "prs" as const, icon: GitPullRequest, label: "Pull requests", count: prs.filter((p) => p.status === "open").length },
            { id: "discussions" as const, icon: MessageSquare, label: "Discussions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Branch selector bar - shown on code and commits tabs */}
        {(activeTab === "code" || activeTab === "commits") && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="gh-outline" size="sm" className="gap-1.5">
                  <GitBranch className="w-4 h-4" />
                  {git.currentBranch?.name || "main"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Switch branch</p>
                {git.branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { git.switchBranch(b); setBranchPopoverOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent/50 flex items-center gap-2 ${
                      git.currentBranch?.id === b.id ? "bg-accent/30 font-medium" : ""
                    }`}
                  >
                    {git.currentBranch?.id === b.id && <Check className="w-3 h-3" />}
                    <span className={git.currentBranch?.id === b.id ? "" : "ml-5"}>{b.name}</span>
                    {b.is_default && <span className="text-[10px] text-muted-foreground ml-auto">default</span>}
                  </button>
                ))}
                {isOwner && (
                  <button
                    onClick={() => { setBranchPopoverOpen(false); setBranchDialogOpen(true); }}
                    className="w-full text-left px-2 py-1.5 text-sm text-accent hover:bg-accent/50 rounded mt-1 border-t border-border"
                  >
                    + New branch
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">{git.branches.length} branch{git.branches.length !== 1 ? "es" : ""}</span>
          </div>
        )}

        {/* Code Tab */}
        {activeTab === "code" && (
          <div>
            {selectedFile ? (
              <div>
                <button onClick={() => setSelectedFile(null)} className="text-sm text-accent hover:underline mb-3 block">← Back to files</button>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedFile.file_name}</span>
                    <span className="text-xs text-muted-foreground">{selectedFile.file_size} bytes</span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm leading-6 font-mono">
                    {selectedFile.content || "Binary file — download to view"}
                  </pre>
                </div>
              </div>
            ) : (
              <div>
                {canUpload && (
                  <div className="flex gap-2 mb-4">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                    <Button variant="gh-primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-1" /> Upload file
                    </Button>
                  </div>
                )}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{git.currentBranch?.name || repo.default_branch}</span>
                  </div>
                  {git.files.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground mb-3">This branch is empty</p>
                      {isOwner && <p className="text-xs text-muted-foreground">Upload a file to get started.</p>}
                    </div>
                  ) : (
                    git.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => !file.is_directory && setSelectedFile(file)}
                        className="w-full flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 hover:bg-secondary/30 text-left"
                      >
                        {file.is_directory ? <Folder className="w-4 h-4 text-accent" /> : <File className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm">{file.file_name}</span>
                      </button>
                    ))
                )}
                <ReadmeEditor repoId={repo.id} branchId={git.currentBranch?.id || null} isOwner={isOwner} userId={user?.id} />
              </div>
              </div>
            )}
          </div>
        )}

        {/* Commits Tab */}
        {activeTab === "commits" && (
          <div>
            <h3 className="font-display font-semibold mb-4">Commits on {git.currentBranch?.name || "main"}</h3>
            {git.commits.length === 0 ? (
              <div className="text-center py-12 border border-border rounded-lg">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No commits yet on this branch</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {git.commits.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium mt-0.5 shrink-0">
                      {c.profiles?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.profiles?.username || "unknown"} committed {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">{c.id.slice(0, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === "issues" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Issues</h3>
              {user && (
                <Button variant="gh-primary" size="sm" asChild>
                  <Link to={`/${username}/${repoName}/issues/new`}>New issue</Link>
                </Button>
              )}
            </div>
            {issues.length === 0 ? (
              <div className="text-center py-12 border border-border rounded-lg">
                <CircleDot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No issues yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {issues.map((issue) => (
                  <Link key={issue.id} to={`/${username}/${repoName}/issues/${issue.issue_number}`} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30">
                    <CircleDot className={`w-4 h-4 mt-0.5 ${issue.status === "open" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <span className="text-sm font-medium hover:text-accent">{issue.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">#{issue.issue_number} opened by {issue.profiles?.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRs Tab */}
        {activeTab === "prs" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Pull Requests</h3>
              {user && (
                <Button variant="gh-primary" size="sm" asChild>
                  <Link to={`/${username}/${repoName}/pulls/new`}>New pull request</Link>
                </Button>
              )}
            </div>
            {prs.length === 0 ? (
              <div className="text-center py-12 border border-border rounded-lg">
                <GitPullRequest className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pull requests yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {prs.map((pr) => (
                  <div key={pr.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30">
                    <GitPullRequest className={`w-4 h-4 mt-0.5 shrink-0 ${
                      pr.status === "open" ? "text-primary" : pr.status === "merged" ? "text-accent" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{pr.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{pr.pr_number} by {pr.profiles?.username} · {pr.source_branch} → {pr.target_branch}
                        {pr.status !== "open" && <span className="ml-1 capitalize">· {pr.status}</span>}
                      </p>
                    </div>
                    {pr.status === "open" && isOwner && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="gh-primary" size="sm" onClick={() => handleMergePR(pr)} className="gap-1">
                          <GitMerge className="w-3.5 h-3.5" /> Merge
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRejectPR(pr.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discussions Tab */}
        {activeTab === "discussions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Discussions</h3>
              {user && (
                <Button variant="gh-primary" size="sm" asChild>
                  <Link to={`/${username}/${repoName}/discussions/new`}>New discussion</Link>
                </Button>
              )}
            </div>
            {discussions.length === 0 ? (
              <div className="text-center py-12 border border-border rounded-lg">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No discussions yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {discussions.map((d) => (
                  <Link key={d.id} to={`/${username}/${repoName}/discussions/${d.id}`} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-accent" />
                    <div>
                      <span className="text-sm font-medium hover:text-accent">{d.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">by {d.profiles?.username} · {d.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collaborators section */}
        <RepoCollaborators repoId={repo.id} isOwner={isOwner} />
      </div>


      {/* Create Branch Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new branch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">From: <span className="font-medium text-foreground">{git.currentBranch?.name}</span></p>
          <Input
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Branch name (e.g., feature/my-feature)"
            className="bg-secondary border-border"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
            <Button variant="gh-primary" onClick={handleCreateBranch} disabled={!newBranchName.trim()}>Create branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Message Dialog */}
      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit file</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Uploading <span className="font-medium text-foreground">{pendingFile?.name}</span> to <span className="font-medium text-foreground">{git.currentBranch?.name}</span>
          </p>
          <Input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message"
            className="bg-secondary border-border"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCommitDialogOpen(false); setPendingFile(null); }}>Cancel</Button>
            <Button variant="gh-primary" onClick={handleCommitUpload} disabled={!commitMessage.trim()}>Commit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default RepoDetail;
