import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: () => void;
}

const FollowButton = ({ targetUserId, onFollowChange }: FollowButtonProps) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.id === targetUserId) { setLoading(false); return; }
    supabase
      .from("user_follows" as any)
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
        setLoading(false);
      });
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId) return null;

  const toggle = async () => {
    setLoading(true);
    if (isFollowing) {
      await (supabase.from("user_follows" as any) as any).delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      setIsFollowing(false);
    } else {
      await (supabase.from("user_follows" as any) as any).insert({ follower_id: user.id, following_id: targetUserId });
      setIsFollowing(true);
    }
    setLoading(false);
    onFollowChange?.();
  };

  return (
    <Button variant={isFollowing ? "gh-outline" : "gh-primary"} size="sm" className="w-full" onClick={toggle} disabled={loading}>
      {isFollowing ? <><UserMinus className="w-3.5 h-3.5 mr-1" /> Unfollow</> : <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>}
    </Button>
  );
};

export default FollowButton;
