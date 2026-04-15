import { useEquippedCosmetics, EquippedCosmetics } from "@/hooks/useCosmetics";

interface CosmeticUsernameProps {
  userId: string | undefined;
  displayName: string;
  className?: string;
  equipped?: EquippedCosmetics;
}

export default function CosmeticUsername({ userId, displayName, className = "", equipped: passedEquipped }: CosmeticUsernameProps) {
  const fetched = useEquippedCosmetics(passedEquipped ? undefined : userId);
  const equipped = passedEquipped || fetched.equipped;
  const nameEffect = equipped.name_effect?.css_value || "";

  return (
    <span className={`${className} ${nameEffect}`}>
      {displayName}
    </span>
  );
}
