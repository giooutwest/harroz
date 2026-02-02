import { BADGES } from "@/hooks/useBadges";

interface BadgeDisplayProps {
  badgeIds: string[];
  size?: "sm" | "md";
  maxDisplay?: number;
}

const BadgeDisplay = ({ badgeIds, size = "sm", maxDisplay = 3 }: BadgeDisplayProps) => {
  if (!badgeIds || badgeIds.length === 0) return null;

  const displayBadges = badgeIds.slice(0, maxDisplay);
  const remaining = badgeIds.length - maxDisplay;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      {displayBadges.map((badgeId) => {
        const badge = BADGES.find((b) => b.id === badgeId);
        if (!badge) return null;

        // Special styling for OG badge (blue check)
        if (badgeId === "og") {
          return (
            <span
              key={badgeId}
              title={badge.name}
              className={`${sizeClasses[size]} font-bold`}
              style={{ color: badge.color }}
            >
              ✓
            </span>
          );
        }

        return (
          <span
            key={badgeId}
            title={badge.name}
            className={sizeClasses[size]}
          >
            {badge.icon}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="text-[10px] text-white/40">+{remaining}</span>
      )}
    </span>
  );
};

export default BadgeDisplay;
