import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ShoppingBag, Sparkles, Crown, Gem, Star, Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  css_value: string;
  price: number;
  rarity: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground border-border",
  rare: "text-blue-400 border-blue-500/40",
  epic: "text-purple-400 border-purple-500/40",
  legendary: "text-amber-400 border-amber-500/40",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-secondary/30",
  rare: "bg-blue-500/5",
  epic: "bg-purple-500/5",
  legendary: "bg-amber-500/5 shadow-[0_0_20px_rgba(251,191,36,0.05)]",
};

const CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
  border: { label: "Avatar Borders", icon: Crown },
  name_effect: { label: "Name Effects", icon: Sparkles },
  badge_style: { label: "Badge Styles", icon: Star },
  profile_accent: { label: "Profile Accents", icon: Gem },
};

const Shop = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equippedMap, setEquippedMap] = useState<Record<string, string>>({});
  const [userXp, setUserXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: shopItems }, { data: inventory }, { data: equipped }, { data: gam }] = await Promise.all([
      supabase.from("shop_items").select("*").order("price"),
      supabase.from("user_inventory").select("item_id").eq("user_id", user.id),
      supabase.from("user_equipped_cosmetics").select("category, item_id").eq("user_id", user.id),
      supabase.from("user_gamification").select("total_xp").eq("user_id", user.id).maybeSingle(),
    ]);

    setItems((shopItems || []) as ShopItem[]);
    setOwnedIds(new Set((inventory || []).map((i) => i.item_id)));
    const eMap: Record<string, string> = {};
    for (const e of (equipped || [])) {
      eMap[e.category] = e.item_id;
    }
    setEquippedMap(eMap);
    setUserXp(gam?.total_xp || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    if (userXp < item.price) {
      toast.error(`Not enough XP! You need ${item.price - userXp} more XP.`);
      return;
    }

    setPurchasing(item.id);

    const { error } = await supabase.rpc("purchase_item", { _item_id: item.id });

    if (error) {
      toast.error(error.message || "Purchase failed");
      setPurchasing(null);
      return;
    }

    toast.success(`Purchased ${item.name}!`);
    setPurchasing(null);
    fetchData();
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;

    // Upsert equipped cosmetic: delete existing, then insert
    await supabase.from("user_equipped_cosmetics").delete().eq("user_id", user.id).eq("category", item.category);
    await supabase.from("user_equipped_cosmetics").insert({
      user_id: user.id,
      category: item.category,
      item_id: item.id,
    });

    toast.success(`Equipped ${item.name}!`);
    fetchData();
  };

  const handleUnequip = async (category: string) => {
    if (!user) return;
    await supabase.from("user_equipped_cosmetics").delete().eq("user_id", user.id).eq("category", category);
    toast.success("Unequipped!");
    fetchData();
  };

  const categories = ["border", "name_effect", "badge_style", "profile_accent"];

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8">
          <div className="animate-pulse h-48 bg-secondary rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Reward Shop</h1>
              <p className="text-sm text-muted-foreground">Spend your XP on cosmetic profile customizations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-4 py-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-foreground">{userXp}</span>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>
        </div>

        <Tabs defaultValue="border" className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border">
            {categories.map((cat) => {
              const catInfo = CATEGORY_LABELS[cat];
              const Icon = catInfo.icon;
              return (
                <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs data-[state=active]:bg-card">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{catInfo.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter((i) => i.category === cat).map((item) => {
                  const owned = ownedIds.has(item.id);
                  const equipped = equippedMap[cat] === item.id;
                  const canAfford = userXp >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-4 space-y-3 transition-all ${RARITY_BG[item.rarity]} ${equipped ? "border-accent shadow-[0_0_12px_rgba(168,85,247,0.2)]" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      {/* Preview */}
                      <div className="flex items-center justify-between">
                        <ItemPreview item={item} />
                        <Badge variant="outline" className={`text-[10px] capitalize ${RARITY_COLORS[item.rarity]}`}>
                          {item.rarity}
                        </Badge>
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-bold">{item.price}</span>
                          <span className="text-[10px] text-muted-foreground">XP</span>
                        </div>

                        {!owned ? (
                          <Button
                            variant="gh-primary"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!canAfford || purchasing === item.id}
                            onClick={() => handlePurchase(item)}
                          >
                            {purchasing === item.id ? "..." : canAfford ? "Buy" : "Not enough XP"}
                          </Button>
                        ) : equipped ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-accent text-accent"
                            onClick={() => handleUnequip(cat)}
                          >
                            <Check className="w-3 h-3 mr-1" /> Equipped
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleEquip(item)}
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

function ItemPreview({ item }: { item: ShopItem }) {
  if (item.category === "border") {
    return (
      <div className={`w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent ${item.css_value}`}>
        A
      </div>
    );
  }
  if (item.category === "name_effect") {
    return (
      <span className={`text-sm font-display ${item.css_value}`}>username</span>
    );
  }
  if (item.category === "badge_style") {
    return (
      <div className={`px-2 py-1 rounded-full border text-[10px] font-medium ${item.css_value}`}>
        <Star className="w-3 h-3 inline mr-1" />Sample
      </div>
    );
  }
  if (item.category === "profile_accent") {
    return (
      <div className={`w-16 h-8 rounded-md bg-gradient-to-r ${item.css_value} border border-border`} />
    );
  }
  return null;
}

export default Shop;
