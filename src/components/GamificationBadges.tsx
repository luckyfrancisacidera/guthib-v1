import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Star, Zap, Target, Award, Medal, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useEquippedCosmetics } from "@/hooks/useCosmetics";

const BADGE_ICONS: Record<string, any> = {
  first_task: Target,
  five_tasks: Star,
  ten_tasks: Crown,
  first_commit: Zap,
  first_pr: Award,
  streak_7: Flame,
  streak_30: Medal,
  board_cleared: Trophy,
};

export default function GamificationBadges({ userId }: { userId: string }) {
  const [gamification, setGamification] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const { equipped } = useEquippedCosmetics(userId);
  const badgeStyleEffect = equipped.badge_style?.css_value || "";

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: g }, { data: b }] = await Promise.all([
        supabase.from("user_gamification").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_badges").select("*").eq("user_id", userId).order("earned_at"),
      ]);
      setGamification(g);
      setBadges(b || []);
    };
    fetchData();

    // Subscribe to realtime updates for immediate refresh
    const channel = supabase
      .channel(`gamification-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_gamification", filter: `user_id=eq.${userId}` }, () => fetchData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_badges", filter: `user_id=eq.${userId}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const xp = gamification?.total_xp || 0;
  const level = gamification?.level || 1;
  const streak = gamification?.current_streak || 0;
  const longestStreak = gamification?.longest_streak || 0;
  const currentLevelMinXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const xpInLevel = xp - currentLevelMinXp;
  const xpNeeded = 100;
  const progressPercent = Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <div className="border border-border rounded-lg p-4 mt-4 space-y-4">
      {/* Level & XP Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Progression
        </h3>
        {streak > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-amber-400">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-bold">{streak}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {streak}-day streak (best: {longestStreak})
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Level display */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
          <span className="text-lg font-bold text-accent">{level}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-semibold text-foreground">Level {level}</span>
            <span className="text-[10px] text-muted-foreground">
              {xpInLevel} / {xpNeeded} XP
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {xp} total XP · {xpNeeded - xpInLevel} XP to level {level + 1}
          </p>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Badges ({badges.length})</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const Icon = BADGE_ICONS[badge.badge_type] || Award;
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger>
                    <div className={`flex items-center gap-1.5 border px-2 py-1 rounded-full ${badgeStyleEffect || "bg-secondary/50 border-border"}`}>
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-medium">{badge.badge_name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{badge.badge_description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {!gamification && badges.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No activity yet</p>
      )}
    </div>
  );
}
