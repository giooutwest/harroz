import { BADGES } from "@/hooks/useBadges";

interface BadgeDisplayProps {
  badgeIds: string[];
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const BadgeDisplay = ({ badgeIds, size = "sm", showName = false }: BadgeDisplayProps) => {
  if (!badgeIds || badgeIds.length === 0) return null;

  // Only show the first badge (since only one can be equipped)
  const badgeId = badgeIds[0];
  const badge = BADGES.find((b) => b.id === badgeId);
  if (!badge) return null;

  const sizeStyles = {
    sm: {
      tag: "px-1.5 py-0.5 text-[10px] gap-1",
      icon: "text-xs",
    },
    md: {
      tag: "px-2 py-1 text-xs gap-1.5",
      icon: "text-sm",
    },
    lg: {
      tag: "px-3 py-1.5 text-sm gap-2",
      icon: "text-base",
    },
  };

  // Name tag style
  return (
    <span
      title={`${badge.name} - ${badge.description}`}
      className={`inline-flex items-center ${sizeStyles[size].tag} rounded-full`}
      style={{
        backgroundColor: `${badge.color}15`,
        border: `1px solid ${badge.color}40`,
      }}
    >
      <span className={sizeStyles[size].icon}>{badge.icon}</span>
      {showName && (
        <span style={{ color: badge.color }} className="font-medium">
          {badge.name}
        </span>
      )}
    </span>
  );
};

export default BadgeDisplay;
