import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { BookOpen, Star, MapPin, LinkIcon, Calendar, Pencil, Users, ShoppingBag } from "lucide-react";
import ContributionGraph from "@/components/ContributionGraph";
import PinnedRepositories from "@/components/PinnedRepositories";
import GamificationBadges from "@/components/GamificationBadges";
import FollowButton from "@/components/FollowButton";
import { useEquippedCosmetics } from "@/hooks/useCosmetics";
import CosmeticAvatar from "@/components/CosmeticAvatar";
import CosmeticUsername from "@/components/CosmeticUsername";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ProfileListModal from "@/components/ProfileListModal";

const UserProfile = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", location: "", website: "" });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listModal, setListModal] = useState<"followers" | "following" | "repositories" | null>(null);

  const fetchFollowCounts = async (profileId: string) => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("user_follows" as any).select("id", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("user_follows" as any).select("id", { count: "exact", head: true }).eq("follower_id", profileId),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const isOwnProfile = user && profile && user.id === profile.id;
  const { equipped } = useEquippedCosmetics(profile?.id);

  useEffect(() => {
    const fetchData = async () => {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("username", username).single();
      if (profileData) {
        setProfile(profileData);
        setForm({
          full_name: profileData.full_name || "",
          bio: profileData.bio || "",
          location: profileData.location || "",
          website: profileData.website || "",
        });
        let repoQuery = supabase.from("repositories").select("*").eq("owner_id", profileData.id).order("updated_at", { ascending: false });
        if (!user || user.id !== profileData.id) {
          repoQuery = repoQuery.eq("is_public", true);
        }
        const { data: repoData } = await repoQuery;
        setRepos(repoData || []);
        fetchFollowCounts(profileData.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [username]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim() || null,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      website: form.website.trim() || null,
    }).eq("id", profile.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile({ ...profile, ...form });
      setEditOpen(false);
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="max-w-[1280px] mx-auto px-4 py-8"><div className="animate-pulse h-48 bg-secondary rounded-lg" /></div></AppLayout>;
  if (!profile) return <AppLayout><div className="max-w-[1280px] mx-auto px-4 py-16 text-center"><h1 className="font-display text-xl font-bold">User not found</h1></div></AppLayout>;

  return (
    <AppLayout>
      <div
        className={`min-h-screen overflow-x-hidden ${equipped.profile_accent ? `bg-gradient-to-br ${equipped.profile_accent.css_value} bg-fixed` : ''}`}
      >
        <div className="max-w-[1280px] mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="lg:col-span-1 space-y-4">
            <CosmeticAvatar userId={profile.id} username={profile.username} avatarUrl={profile.avatar_url} size="lg" equipped={equipped} />
            <div>
              <CosmeticUsername userId={profile.id} displayName={profile.full_name || profile.username} className="font-display text-xl font-bold block" equipped={equipped} />
              <p className="text-sm text-muted-foreground">{profile.username}</p>
            </div>
            {profile.bio && <p className="text-sm">{profile.bio}</p>}
            <div className="space-y-1 text-sm text-muted-foreground">
              {profile.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{profile.location}</p>}
              {profile.website && <p className="flex items-center gap-2 min-w-0"><LinkIcon className="w-4 h-4 shrink-0" /><a href={profile.website} className="text-accent hover:underline truncate">{profile.website}</a></p>}
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4" />Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => setListModal("followers")} className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"><Users className="w-4 h-4" /><strong>{followerCount}</strong> followers</button>
              <span>·</span>
              <button onClick={() => setListModal("following")} className="hover:text-accent transition-colors cursor-pointer"><strong>{followingCount}</strong> following</button>
            </div>
            {!isOwnProfile && (
              <FollowButton targetUserId={profile.id} onFollowChange={() => fetchFollowCounts(profile.id)} />
            )}
            {isOwnProfile && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit profile
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/shop"><ShoppingBag className="w-3.5 h-3.5" /></Link>
                </Button>
              </div>
            )}
            <GamificationBadges userId={profile.id} />
          </div>

          <div className="lg:col-span-3 space-y-6 min-w-0">
            <ContributionGraph userId={profile.id} />
            <PinnedRepositories profileId={profile.id} username={profile.username} />
            <button onClick={() => setListModal("repositories")} className="font-display font-semibold mb-4 hover:text-accent transition-colors cursor-pointer text-left">Repositories ({repos.length})</button>
            <div className="space-y-0 border border-border rounded-lg overflow-hidden">
              {repos.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No repositories</div>
              ) : repos.map((repo) => (
                <div key={repo.id} className="p-4 border-b border-border last:border-b-0 hover:bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Link to={`/${username}/${repo.name}`} className="text-accent font-semibold hover:underline text-sm">{repo.name}</Link>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                      {repo.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                  {repo.description && <p className="text-xs text-muted-foreground mt-1">{repo.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {repo.language && <span>{repo.language}</span>}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {profile && (
        <ProfileListModal
          open={listModal !== null}
          onOpenChange={(open) => !open && setListModal(null)}
          profileId={profile.id}
          type={listModal || "followers"}
          username={profile.username}
        />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Name</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" className="bg-secondary border-border" maxLength={100} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Bio</label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself" className="bg-secondary border-border resize-none" rows={3} maxLength={500} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" className="bg-secondary border-border" maxLength={100} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Website / Social link</label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://linkedin.com/in/you" className="bg-secondary border-border" maxLength={255} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="gh-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserProfile;
