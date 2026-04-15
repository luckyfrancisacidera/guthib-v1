import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BADGE_DEFS: { type: string; name: string; desc: string; check: (stats: any) => boolean }[] = [
  { type: "first_task", name: "First Task", desc: "Completed your first task", check: (s) => s.tasksCompleted >= 1 },
  { type: "five_tasks", name: "Task Master", desc: "Completed 5 tasks", check: (s) => s.tasksCompleted >= 5 },
  { type: "ten_tasks", name: "Productivity Pro", desc: "Completed 10 tasks", check: (s) => s.tasksCompleted >= 10 },
  { type: "first_commit", name: "First Commit", desc: "Made your first commit", check: (s) => s.commits >= 1 },
  { type: "first_pr", name: "PR Pioneer", desc: "Opened your first pull request", check: (s) => s.prs >= 1 },
  { type: "streak_7", name: "Week Warrior", desc: "7-day activity streak", check: (s) => s.streak >= 7 },
  { type: "streak_30", name: "Monthly Machine", desc: "30-day activity streak", check: (s) => s.streak >= 30 },
  { type: "board_cleared", name: "Board Clearer", desc: "Completed all tasks in a board", check: (s) => s.boardsCleared >= 1 },
];

const XP_VALUES = { task_complete: 10, commit: 5, pr_open: 15, pr_merge: 25, issue_open: 5, review: 10 };

export function useGamification() {
  const { user } = useAuth();

  /** Award XP to a specific user (defaults to current user) */
  const awardXP = async (action: keyof typeof XP_VALUES, targetUserId?: string) => {
    const uid = targetUserId || user?.id;
    if (!uid) return;
    const xp = XP_VALUES[action];
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("user_gamification")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_gamification").insert({
        user_id: uid,
        total_xp: xp,
        level: 1,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      });
    } else {
      const lastDate = existing.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = existing.current_streak;
      if (lastDate === yesterdayStr) newStreak += 1;
      else if (lastDate !== today) newStreak = 1;

      const newXp = existing.total_xp + xp;
      const newLevel = Math.floor(newXp / 100) + 1;

      await supabase
        .from("user_gamification")
        .update({
          total_xp: newXp,
          level: newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, existing.longest_streak),
          last_activity_date: today,
        })
        .eq("user_id", uid);
    }

    await checkBadges(uid);
  };

  const checkBadges = async (targetUserId?: string) => {
    const uid = targetUserId || user?.id;
    if (!uid) return;

    const [{ count: tasksCompleted }, { count: commits }, { count: prs }, { data: gam }, { data: existingBadges }] =
      await Promise.all([
        supabase.from("task_submissions").select("*", { count: "exact", head: true }).eq("submitter_id", uid).eq("status", "accepted"),
        supabase.from("commits").select("*", { count: "exact", head: true }).eq("author_id", uid),
        supabase.from("pull_requests").select("*", { count: "exact", head: true }).eq("author_id", uid),
        supabase.from("user_gamification").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("user_badges").select("badge_type").eq("user_id", uid),
      ]);

    const earnedTypes = new Set((existingBadges || []).map((b: any) => b.badge_type));
    const stats = {
      tasksCompleted: tasksCompleted || 0,
      commits: commits || 0,
      prs: prs || 0,
      streak: gam?.current_streak || 0,
      boardsCleared: 0,
    };

    for (const badge of BADGE_DEFS) {
      if (!earnedTypes.has(badge.type) && badge.check(stats)) {
        await supabase.from("user_badges").insert({
          user_id: uid,
          badge_type: badge.type,
          badge_name: badge.name,
          badge_description: badge.desc,
        });
      }
    }
  };

  return { awardXP, checkBadges };
}
