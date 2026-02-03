import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Check, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useBadges, BADGES, Badge } from "@/hooks/useBadges";

const BadgesSection = () => {
  const { earnedBadges, progress, loading, toggleEquipped } = useBadges();
  const [showQuests, setShowQuests] = useState(true);

  const isEarned = (badgeId: string) => earnedBadges.some(b => b.badge_id === badgeId);
  const isEquipped = (badgeId: string) => earnedBadges.find(b => b.badge_id === badgeId)?.is_equipped || false;

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
          Loading badges...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your Badges */}
      {earnedBadgesList.length > 0 ? (
        <div>
          <h5 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2" style={{ fontFamily: "'Space Mono', monospace" }}>
            Your_Badges ({earnedBadgesList.length})
          </h5>
          <p className="text-white/30 text-[10px] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
            Tap to equip. One badge shows on your profile.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {earnedBadgesList.map((badge) => (
              <motion.button
                key={badge.id}
                onClick={() => toggleEquipped(badge.id)}
                whileTap={{ scale: 0.98 }}
                className={`p-3 border text-left transition-all ${
                  isEquipped(badge.id)
                    ? "bg-white/10 border-white/40"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{badge.icon}</span>
                  {isEquipped(badge.id) && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-500 uppercase" style={{ fontFamily: "'Space Mono', monospace" }}>
                      Equipped
                    </span>
                  )}
                </div>
                <p className="text-white font-bold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                  {badge.name}
                </p>
                <p className="text-white/40 text-[10px] leading-tight mt-1">
                  {badge.description}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <span
                    className="text-[8px] px-1.5 py-0.5 uppercase"
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      backgroundColor: `${getRarityColor(badge.rarity)}20`,
                      color: getRarityColor(badge.rarity),
                    }}
                  >
                    {badge.rarity}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white/5 border border-white/10 text-center">
          <Award className="w-8 h-8 mx-auto mb-2 text-white/30" />
          <p className="text-white/40 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
            No badges yet
          </p>
          <p className="text-white/30 text-xs mt-1">Complete quests below to earn badges!</p>
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
            <Award className="w-3 h-3" /> Quests ({lockedBadges.length} remaining)
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
                    className="p-3 bg-white/5 border border-white/10 opacity-70"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white/30" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white/60 font-bold text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                            {badge.name}
                          </p>
                          <span
                            className="text-[8px] px-1.5 py-0.5 uppercase"
                            style={{
                              fontFamily: "'Space Mono', monospace",
                              backgroundColor: `${getRarityColor(badge.rarity)}20`,
                              color: getRarityColor(badge.rarity),
                            }}
                          >
                            {badge.rarity}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">
                          {badge.quest?.description}
                        </p>

                        {/* Progress bar */}
                        {prog && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] text-white/40 mb-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                              <span>Progress</span>
                              <span>{prog.current}/{prog.target}</span>
                            </div>
                            <div className="h-1.5 bg-white/10 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                className="h-full"
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
                    All badges unlocked!
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
