import { useEquippedCosmetics, EquippedCosmetics } from "@/hooks/useCosmetics";

interface CosmeticAvatarProps {
  userId: string | undefined;
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  equipped?: EquippedCosmetics;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-24 h-24 text-3xl",
};

export default function CosmeticAvatar({ userId, username, avatarUrl, size = "md", equipped: passedEquipped }: CosmeticAvatarProps) {
  const fetched = useEquippedCosmetics(passedEquipped ? undefined : userId);
  const equipped = passedEquipped || fetched.equipped;
  const borderEffect = equipped.border?.css_value || "";

  return (
    <div className={`${SIZE_CLASSES[size]} rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent ${borderEffect}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className="w-full h-full rounded-full object-cover" />
      ) : (
        username?.[0]?.toUpperCase() || "?"
      )}
    </div>
  );
}
