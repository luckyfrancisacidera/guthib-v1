import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trophy, Zap, Flame, Medal, Crown, Shield } from "lucide-react";
import { toast } from "sonner";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import CosmeticUsername from "@/components/CosmeticUsername";

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  username: string;
  avatar_url: string | null;
}

const RANK_STYLES = [
  { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  { icon: Medal, color: "text-slate-300", bg: "bg-slate-400/10 border-slate-400/30" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/30" },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    if (user) fetchPrivacySetting();
  }, [user]);

  const fetchLeaderboard = async () => {
    const { data: gamData } = await supabase
      .from("user_gamification")
      .select("user_id, total_xp, level, current_streak, show_on_leaderboard")
      .eq("show_on_leaderboard", true)
      .order("total_xp", { ascending: false })
      .limit(50);

    if (!gamData || gamData.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const userIds = gamData.map((g: any) => g.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const pMap = new Map((profiles || []).map((p) => [p.id, p]));

    setEntries(
      gamData.map((g: any) => ({
        ...g,
        username: pMap.get(g.user_id)?.username || "unknown",
        avatar_url: pMap.get(g.user_id)?.avatar_url || null,
      }))
    );
    setLoading(false);
  };

  const fetchPrivacySetting = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_gamification")
      .select("show_on_leaderboard")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setShowOnLeaderboard(data.show_on_leaderboard);
  };

  const toggleVisibility = async (checked: boolean) => {
    if (!user) return;
    setToggling(true);

    await supabase.rpc("toggle_leaderboard_visibility", { _show: checked });

    setShowOnLeaderboard(checked);
    toast.success(checked ? "You're now visible on the leaderboard" : "You're now hidden from the leaderboard");
    setToggling(false);
    fetchLeaderboard();
  };

  return (
    <AppLayout>
      <div className="max-w-[700px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="lb-toggle">
                {showOnLeaderboard ? "Public" : "Private"}
              </label>
              <Switch
                id="lb-toggle"
                checked={showOnLeaderboard}
                onCheckedChange={toggleVisibility}
                disabled={toggling}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No contributors yet. Complete missions to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const rankStyle = RANK_STYLES[idx] || null;
              const isCurrentUser = user?.id === entry.user_id;
              const xpInLevel = entry.total_xp % 100;

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    rankStyle ? rankStyle.bg : "bg-background border-border"
                  } ${isCurrentUser ? "ring-1 ring-accent/50" : ""}`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {rankStyle ? (
                      <rankStyle.icon className={`w-5 h-5 mx-auto ${rankStyle.color}`} />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar with cosmetics */}
                  <Link to={`/${entry.username}`} className="shrink-0">
                    <CosmeticAvatar userId={entry.user_id} username={entry.username} avatarUrl={entry.avatar_url} size="md" />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/${entry.username}`} className="hover:underline truncate">
                        <CosmeticUsername userId={entry.user_id} displayName={entry.username} className="text-sm font-semibold text-foreground" />
                      </Link>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-[9px]">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" />Lvl {entry.level}
                      </span>
                      {entry.current_streak > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />{entry.current_streak}d
                        </span>
                      )}
                    </div>
                    {/* XP progress bar */}
                    <div className="w-full h-1 bg-secondary rounded-full mt-1.5">
                      <div
                        className="h-1 bg-amber-400 rounded-full transition-all"
                        style={{ width: `${xpInLevel}%` }}
                      />
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-right shrink-0">
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold">
                      <Zap className="w-3 h-3 mr-0.5" />{entry.total_xp} XP
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
