import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Check, Lock, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { useBadges, BADGES, Badge } from "@/hooks/useBadges";
import BadgeDisplay from "./BadgeDisplay";

const BadgesSection = () => {
  const { earnedBadges, progress, loading, toggleEquipped } = useBadges();
  const [showQuests, setShowQuests] = useState(true);

  const isEarned = (badgeId: string) => earnedBadges.some(b => b.badge_id === badgeId);
  const isEquipped = (badgeId: string) => earnedBadges.find(b => b.badge_id === badgeId)?.is_equipped || false;
  const equippedBadge = earnedBadges.find(b => b.is_equipped);

  const getRarityColor = (rarity: Badge["rarity"]) => {
    switch (rarity) {
      case "common": return "#9CA3AF";
      case "rare": return "#3B82F6";
      case "epic": return "#8B5CF6";
      case "legendary": return "#F59E0B";
    }
  };

  const earnedBadgesList = BADGES.filter(b => isEarned(b.id));
  const lockedBadges = BADGES.filter(b => !isEarned(b.id) && b.quest);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-white/40 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Name Tag Preview */}
      <div className="p-4 bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-[#C5A059]" />
          <span className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
            Your_Name_Tag
          </span>
        </div>

        <div className="flex items-center gap-2 p-3 bg-black/30 rounded-lg">
          <div className="w-8 h-8 bg-white/20 rounded-full" />
          <span className="text-white font-medium">Your Name</span>
          {equippedBadge ? (
            <BadgeDisplay badgeIds={[equippedBadge.badge_id]} size="md" showName />
          ) : (
            <span className="text-white/30 text-xs italic">No tag equipped</span>
          )}
        </div>

        <p className="text-white/30 text-[10px] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          This shows next to your name everywhere
        </p>
      </div>

      {/* Unlocked Name Tags */}
      {earnedBadgesList.length > 0 ? (
        <div>
          <h5 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
            Unlocked_Tags ({earnedBadgesList.length})
          </h5>
          <div className="space-y-2">
            {earnedBadgesList.map((badge) => (
              <motion.button
                key={badge.id}
                onClick={() => toggleEquipped(badge.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-3 border text-left transition-all flex items-center gap-3 ${
                  isEquipped(badge.id)
                    ? "bg-white/10 border-[#C5A059]/50"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Tag Preview */}
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-lg text-2xl"
                  style={{
                    backgroundColor: `${badge.color}20`,
                    border: `2px solid ${badge.color}40`
                  }}
                >
                  {badge.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {badge.name}
                    </p>
                    <span
                      className="text-[8px] px-1.5 py-0.5 uppercase rounded"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        backgroundColor: `${getRarityColor(badge.rarity)}20`,
                        color: getRarityColor(badge.rarity),
                      }}
                    >
                      {badge.rarity}
                    </span>
                  </div>
                  <p className="text-white/40 text-[10px] leading-tight mt-0.5 truncate">
                    {badge.description}
                  </p>
                </div>

                {/* Equip Status */}
                <div className="shrink-0">
                  {isEquipped(badge.id) ? (
                    <span
                      className="text-[10px] px-2 py-1 bg-[#C5A059]/20 text-[#C5A059] uppercase rounded"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="text-[10px] px-2 py-1 bg-white/5 text-white/40 uppercase rounded"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      Tap to use
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white/5 border border-white/10 text-center">
          <Award className="w-8 h-8 mx-auto mb-2 text-white/30" />
          <p className="text-white/40 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
            No name tags yet
          </p>
          <p className="text-white/30 text-xs mt-1">Complete quests to unlock tags!</p>
        </div>
      )}

      {/* Quests Section */}
      <div>
        <button
          onClick={() => setShowQuests(!showQuests)}
          className="w-full flex items-center justify-between text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span className="flex items-center gap-2">
            <Lock className="w-3 h-3" /> Locked_Tags ({lockedBadges.length})
          </span>
          {showQuests ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showQuests && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {lockedBadges.map((badge) => {
                const prog = progress[badge.id];
                const progressPercent = prog ? Math.min((prog.current / prog.target) * 100, 100) : 0;

                return (
                  <div
                    key={badge.id}
                    className="p-3 bg-white/5 border border-white/10 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      {/* Locked Icon */}
                      <div
                        className="w-12 h-12 flex items-center justify-center rounded-lg bg-white/5 border border-white/10"
                      >
                        <Lock className="w-5 h-5 text-white/30" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white/60 font-bold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                            {badge.name}
                          </p>
                          <span className="text-lg opacity-50">{badge.icon}</span>
                        </div>
                        <p className="text-white/40 text-[10px]">
                          {badge.quest?.description}
                        </p>

                        {/* Progress bar */}
                        {prog && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[9px] text-white/40 mb-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                              <span>{prog.current}/{prog.target}</span>
                              <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: getRarityColor(badge.rarity) }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {lockedBadges.length === 0 && (
                <div className="p-4 text-center border border-dashed border-white/10">
                  <p className="text-white/40 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                    All tags unlocked!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BadgesSection;
