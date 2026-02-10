import { Flame, Sun, TrendingUp, Activity, Settings, Share2, Swords } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import BadgeDisplay from "./BadgeDisplay";
import { useBadges } from "@/hooks/useBadges";

interface StudioProfileViewProps {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  currentStreak: number;
  bestStreak: number;
  totalGoodDays: number;
  totalEntries: number;
  yearlyAverage: number;
  equippedBadges?: string[];
  onEditClick: () => void;
  onSettingsClick: () => void;
  onWeeklyRecapClick: () => void;
  nemesisProfile?: { display_name: string | null; username: string | null } | null;
  rivalryStats?: {
    wins: number;
    losses: number;
    draws: number;
    avgDifferential: number;
    currentStreakCount: number;
    currentStreakType: string | null;
  } | null;
}

const StudioProfileView = ({
  displayName,
  username,
  avatarUrl,
  currentStreak,
  bestStreak,
  totalGoodDays,
  totalEntries,
  yearlyAverage,
  equippedBadges = [],
  onEditClick,
  onSettingsClick,
  onWeeklyRecapClick,
  nemesisProfile,
  rivalryStats,
}: StudioProfileViewProps) => {
  const { ogBadgeColor } = useBadges();

  return (
    <div className="px-6 py-8 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-border">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-secondary text-muted-foreground text-xl">
              {displayName?.charAt(0) || username?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{displayName || "You"}</h1>
            <div className="flex items-center gap-2">
              {username && <p className="text-sm text-muted-foreground">@{username}</p>}
              {equippedBadges.length > 0 && (
                <BadgeDisplay
                  badgeIds={equippedBadges}
                  size="md"
                  customColor={equippedBadges.includes("og") ? ogBadgeColor : undefined}
                />
              )}
            </div>
          </div>
        </div>
        <button onClick={onSettingsClick} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Streak */}
      {currentStreak > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentStreak} Day Streak</p>
            <p className="text-sm text-muted-foreground">Keep it going!</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <Flame className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{bestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <Sun className="w-5 h-5 text-yellow-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalGoodDays}</p>
          <p className="text-xs text-muted-foreground">Sunny Days</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <TrendingUp className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{yearlyAverage.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Average Mood</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <Activity className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalEntries}</p>
          <p className="text-xs text-muted-foreground">Total Entries</p>
        </div>
      </div>

      {/* Rivalry Stats */}
      {nemesisProfile && rivalryStats && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-foreground text-sm">
              Rivalry vs {nemesisProfile.display_name || nemesisProfile.username}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{rivalryStats.wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{rivalryStats.losses}</p>
              <p className="text-xs text-muted-foreground">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground/50">{rivalryStats.draws}</p>
              <p className="text-xs text-muted-foreground">Draws</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Avg Diff: {rivalryStats.avgDifferential > 0 ? '+' : ''}{rivalryStats.avgDifferential.toFixed(1)}</span>
            {rivalryStats.currentStreakCount > 1 && rivalryStats.currentStreakType && (
              <span className={rivalryStats.currentStreakType === 'W' ? 'text-green-500' : rivalryStats.currentStreakType === 'L' ? 'text-red-500' : ''}>
                {rivalryStats.currentStreakCount}{rivalryStats.currentStreakType} Streak
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onEditClick}
          className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors text-sm"
        >
          Edit Profile
        </button>
        <button
          onClick={onWeeklyRecapClick}
          className="py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Weekly Recap
        </button>
      </div>
    </div>
  );
};

export default StudioProfileView;
