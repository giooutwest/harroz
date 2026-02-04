import { BADGES } from "@/hooks/useBadges";

interface BadgeDisplayProps {
  badgeIds: string[];
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  customColor?: string; // For user-customized badge colors
}

// Twitter-style verified checkmark SVG
const VerifiedBadge = ({ color, size }: { color: string; size: number }) => (
  <svg
    viewBox="0 0 22 22"
    width={size}
    height={size}
    aria-label="Verified"
    role="img"
  >
    <g>
      <path
        fill={color}
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </g>
  </svg>
);

const BadgeDisplay = ({ badgeIds, size = "sm", showName = false, customColor }: BadgeDisplayProps) => {
  if (!badgeIds || badgeIds.length === 0) return null;

  // Only show the first badge (since only one can be equipped)
  const badgeId = badgeIds[0];
  const badge = BADGES.find((b) => b.id === badgeId);
  if (!badge) return null;

  // Use custom color if provided, otherwise use badge's default color
  const displayColor = customColor || badge.color;

  const sizeConfig = {
    sm: { iconSize: 14, tag: "gap-1", text: "text-[10px]" },
    md: { iconSize: 18, tag: "gap-1.5", text: "text-xs" },
    lg: { iconSize: 22, tag: "gap-2", text: "text-sm" },
  };

  // For verified badges (Twitter-style), render just the checkmark
  if (badge.type === "verified") {
    return (
      <span
        title={`${badge.name} - ${badge.description}`}
        className={`inline-flex items-center ${sizeConfig[size].tag}`}
      >
        <VerifiedBadge color={displayColor} size={sizeConfig[size].iconSize} />
        {showName && (
          <span style={{ color: displayColor }} className={`font-medium ${sizeConfig[size].text}`}>
            {badge.name}
          </span>
        )}
      </span>
    );
  }

  // For regular emoji badges, use the pill style
  const pillStyles = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  return (
    <span
      title={`${badge.name} - ${badge.description}`}
      className={`inline-flex items-center ${pillStyles[size]} rounded-full`}
      style={{
        backgroundColor: `${displayColor}15`,
        border: `1px solid ${displayColor}40`,
      }}
    >
      <span className={sizeConfig[size].text}>{badge.icon}</span>
      {showName && (
        <span style={{ color: displayColor }} className="font-medium">
          {badge.name}
        </span>
      )}
    </span>
  );
};

export default BadgeDisplay;
