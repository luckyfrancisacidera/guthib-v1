import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  css_value: string;
  preview_css: string | null;
  price: number;
  rarity: string;
}

export interface EquippedCosmetics {
  border?: ShopItem;
  name_effect?: ShopItem;
  badge_style?: ShopItem;
  profile_accent?: ShopItem;
}

export function useEquippedCosmetics(userId: string | undefined) {
  const [equipped, setEquipped] = useState<EquippedCosmetics>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetchCosmetics = async () => {
      const { data } = await supabase
        .from("user_equipped_cosmetics")
        .select("category, item_id")
        .eq("user_id", userId);

      if (!data || data.length === 0) {
        setEquipped({});
        setLoading(false);
        return;
      }

      const itemIds = data.map((d) => d.item_id);
      const { data: items } = await supabase
        .from("shop_items")
        .select("*")
        .in("id", itemIds);

      const itemMap = new Map((items || []).map((i) => [i.id, i as ShopItem]));
      const result: EquippedCosmetics = {};
      for (const row of data) {
        const item = itemMap.get(row.item_id);
        if (item) {
          (result as any)[row.category] = item;
        }
      }
      setEquipped(result);
      setLoading(false);
    };

    fetchCosmetics();
  }, [userId]);

  return { equipped, loading };
}
