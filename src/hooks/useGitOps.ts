import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface Branch {
  id: string;
  repo_id: string;
  name: string;
  created_by: string;
  parent_branch_id: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Commit {
  id: string;
  repo_id: string;
  branch_id: string;
  author_id: string;
  message: string;
  created_at: string;
  profiles?: { username: string };
  commit_files?: CommitFile[];
}

export interface CommitFile {
  id: string;
  commit_id: string;
  file_path: string;
  file_name: string;
  content: string | null;
  storage_path: string | null;
  file_size: number;
  action: string;
}

export interface RepoFile {
  id: string;
  file_name: string;
  file_path: string;
  is_directory: boolean;
  file_size: number;
  content: string | null;
  storage_path: string | null;
  updated_at: string;
  branch_id: string | null;
}

export function useGitOps(repoId: string | undefined, userId: string | undefined) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [files, setFiles] = useState<RepoFile[]>([]);

  const fetchBranches = useCallback(async () => {
    if (!repoId) return;
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("repo_id", repoId)
      .order("is_default", { ascending: false })
      .order("name");
    const list = (data as Branch[]) || [];
    setBranches(list);
    if (!currentBranch && list.length > 0) {
      const def = list.find((b) => b.is_default) || list[0];
      setCurrentBranch(def);
    }
    return list;
  }, [repoId, currentBranch]);

  const fetchFiles = useCallback(async (branchId: string) => {
    if (!repoId) return;
    const { data } = await supabase
      .from("repo_files")
      .select("*")
      .eq("repo_id", repoId)
      .eq("branch_id", branchId)
      .order("is_directory", { ascending: false })
      .order("file_name");
    setFiles((data as RepoFile[]) || []);
  }, [repoId]);

  const fetchCommits = useCallback(async (branchId: string) => {
    if (!repoId) return;
    const { data } = await supabase
      .from("commits")
      .select("*, profiles:author_id(username)")
      .eq("repo_id", repoId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(50);
    setCommits((data as unknown as Commit[]) || []);
  }, [repoId]);

  const switchBranch = useCallback(async (branch: Branch) => {
    setCurrentBranch(branch);
    await Promise.all([fetchFiles(branch.id), fetchCommits(branch.id)]);
  }, [fetchFiles, fetchCommits]);

  const createBranch = useCallback(async (name: string): Promise<{ error?: string }> => {
    if (!repoId || !userId || !currentBranch) return { error: "Missing context" };
    const trimmed = name.trim().toLowerCase().replace(/[^a-z0-9\-_\/]/g, "-");
    if (!trimmed) return { error: "Invalid branch name" };

    // Check duplicate
    const existing = branches.find((b) => b.name === trimmed);
    if (existing) return { error: "Branch already exists" };

    const { data, error } = await supabase
      .from("branches")
      .insert({ repo_id: repoId, name: trimmed, created_by: userId, parent_branch_id: currentBranch.id })
      .select()
      .single();
    if (error) return { error: error.message };

    const newBranch = data as Branch;

    // Copy files from current branch to new branch
    const currentFiles = files;
    if (currentFiles.length > 0) {
      const newFiles = currentFiles.map((f) => ({
        repo_id: repoId,
        file_path: f.file_path,
        file_name: f.file_name,
        content: f.content,
        storage_path: f.storage_path,
        file_size: f.file_size,
        is_directory: f.is_directory,
        branch_id: newBranch.id,
      }));
      await supabase.from("repo_files").insert(newFiles);
    }

    // Create initial commit
    await supabase.from("commits").insert({
      repo_id: repoId,
      branch_id: newBranch.id,
      author_id: userId,
      message: `Branch '${trimmed}' created from '${currentBranch.name}'`,
    });

    await fetchBranches();
    await switchBranch(newBranch);
    return {};
  }, [repoId, userId, currentBranch, branches, files, fetchBranches, switchBranch]);

  const uploadFileWithCommit = useCallback(async (
    file: File,
    branchId: string,
    message: string
  ): Promise<{ error?: string }> => {
    if (!repoId || !userId) return { error: "Missing context" };
    const isText = file.type.startsWith("text/") || /\.(js|ts|tsx|jsx|py|rb|go|rs|md|json|css|html|xml|yaml|yml|toml|sh|bash|sql|txt|csv)$/i.test(file.name);

    try {
      let content: string | null = null;
      let storagePath: string | null = null;

      if (isText) {
        content = await file.text();
      } else {
        const path = `${repoId}/${branchId}/${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("repo-files").upload(path, file, { upsert: true });
        if (uploadErr) return { error: uploadErr.message };
        storagePath = path;
      }

      // Check if file already exists on this branch
      const existingFile = files.find((f) => f.file_name === file.name && f.branch_id === branchId);
      const action = existingFile ? "modified" : "added";

      if (existingFile) {
        await supabase.from("repo_files").update({
          content,
          storage_path: storagePath,
          file_size: file.size,
          updated_at: new Date().toISOString(),
        }).eq("id", existingFile.id);
      } else {
        await supabase.from("repo_files").insert({
          repo_id: repoId,
          file_path: file.name,
          file_name: file.name,
          content,
          storage_path: storagePath,
          file_size: file.size,
          is_directory: false,
          branch_id: branchId,
        });
      }

      // Create commit
      const { data: commit } = await supabase.from("commits").insert({
        repo_id: repoId,
        branch_id: branchId,
        author_id: userId,
        message: message || `${action === "added" ? "Add" : "Update"} ${file.name}`,
      }).select().single();

      if (commit) {
        await supabase.from("commit_files").insert({
          commit_id: (commit as Commit).id,
          file_path: file.name,
          file_name: file.name,
          content,
          storage_path: storagePath,
          file_size: file.size,
          action,
        });
      }

      await fetchFiles(branchId);
      await fetchCommits(branchId);
      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  }, [repoId, userId, files, fetchFiles, fetchCommits]);

  const mergeBranch = useCallback(async (
    sourceBranchId: string,
    targetBranchId: string,
    prId?: string
  ): Promise<{ error?: string }> => {
    if (!repoId || !userId) return { error: "Missing context" };

    // Get source branch files
    const { data: sourceFiles } = await supabase
      .from("repo_files")
      .select("*")
      .eq("repo_id", repoId)
      .eq("branch_id", sourceBranchId);

    if (!sourceFiles) return { error: "No files to merge" };

    // Get target branch files
    const { data: targetFiles } = await supabase
      .from("repo_files")
      .select("*")
      .eq("repo_id", repoId)
      .eq("branch_id", targetBranchId);

    const targetMap = new Map((targetFiles || []).map((f: any) => [f.file_name, f]));
    const commitFileEntries: any[] = [];

    for (const sf of sourceFiles as RepoFile[]) {
      const existing = targetMap.get(sf.file_name) as RepoFile | undefined;
      if (existing) {
        // Update existing file
        await supabase.from("repo_files").update({
          content: sf.content,
          storage_path: sf.storage_path,
          file_size: sf.file_size,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        commitFileEntries.push({ file_path: sf.file_path, file_name: sf.file_name, content: sf.content, storage_path: sf.storage_path, file_size: sf.file_size, action: "modified" });
      } else {
        // Insert new file
        await supabase.from("repo_files").insert({
          repo_id: repoId,
          file_path: sf.file_path,
          file_name: sf.file_name,
          content: sf.content,
          storage_path: sf.storage_path,
          file_size: sf.file_size,
          is_directory: sf.is_directory,
          branch_id: targetBranchId,
        });
        commitFileEntries.push({ file_path: sf.file_path, file_name: sf.file_name, content: sf.content, storage_path: sf.storage_path, file_size: sf.file_size, action: "added" });
      }
    }

    // Create merge commit on target
    const sourceBranch = branches.find((b) => b.id === sourceBranchId);
    const targetBranch = branches.find((b) => b.id === targetBranchId);
    const { data: commit } = await supabase.from("commits").insert({
      repo_id: repoId,
      branch_id: targetBranchId,
      author_id: userId,
      message: `Merge branch '${sourceBranch?.name || "unknown"}' into '${targetBranch?.name || "main"}'`,
    }).select().single();

    if (commit && commitFileEntries.length > 0) {
      await supabase.from("commit_files").insert(
        commitFileEntries.map((cf) => ({ ...cf, commit_id: (commit as Commit).id }))
      );
    }

    // Update PR status if provided
    if (prId) {
      await supabase.from("pull_requests").update({ status: "merged" }).eq("id", prId);
    }

    return {};
  }, [repoId, userId, branches]);

  const downloadAsZip = useCallback(async (branchId: string, branchName: string, repoName: string) => {
    const { data: branchFiles } = await supabase
      .from("repo_files")
      .select("*")
      .eq("repo_id", repoId)
      .eq("branch_id", branchId);

    if (!branchFiles || branchFiles.length === 0) return { error: "No files to download" };

    const zip = new JSZip();
    const folder = zip.folder(`${repoName}-${branchName}`)!;

    for (const f of branchFiles as RepoFile[]) {
      if (f.is_directory) continue;
      if (f.content) {
        folder.file(f.file_path, f.content);
      } else if (f.storage_path) {
        const { data } = await supabase.storage.from("repo-files").download(f.storage_path);
        if (data) {
          folder.file(f.file_path, data);
        }
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${repoName}-${branchName}.zip`);
    return {};
  }, [repoId]);

  return {
    branches,
    currentBranch,
    commits,
    files,
    setCurrentBranch,
    fetchBranches,
    fetchFiles,
    fetchCommits,
    switchBranch,
    createBranch,
    uploadFileWithCommit,
    mergeBranch,
    downloadAsZip,
  };
}
