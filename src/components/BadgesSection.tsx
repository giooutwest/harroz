import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Lock, ChevronDown, ChevronUp, Tag, Palette } from "lucide-react";
import { useBadges, BADGES, Badge, OG_BADGE_COLORS } from "@/hooks/useBadges";
import BadgeDisplay from "./BadgeDisplay";

const BadgesSection = () => {
  const { earnedBadges, progress, loading, toggleEquipped, ogBadgeColor, saveOgBadgeColor } = useBadges();
  const [showQuests, setShowQuests] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isEarned = (badgeId: string) => earnedBadges.some(b => b.badge_id === badgeId);
  const isEquipped = (badgeId: string) => earnedBadges.find(b => b.badge_id === badgeId)?.is_equipped || false;
  const equippedBadge = earnedBadges.find(b => b.is_equipped);
  const equippedBadgeData = equippedBadge ? BADGES.find(b => b.id === equippedBadge.badge_id) : null;

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

  // Get the display color for a badge (custom for OG, default for others)
  const getBadgeDisplayColor = (badge: Badge) => {
    if (badge.id === "og") {
      return ogBadgeColor;
    }
    return badge.color;
  };

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
            <BadgeDisplay
              badgeIds={[equippedBadge.badge_id]}
              size="md"
              showName
              customColor={equippedBadgeData?.id === "og" ? ogBadgeColor : undefined}
            />
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
              <div key={badge.id}>
                <motion.button
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
                    className="w-12 h-12 flex items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${getBadgeDisplayColor(badge)}20`,
                      border: `2px solid ${getBadgeDisplayColor(badge)}40`
                    }}
                  >
                    {badge.type === "verified" ? (
                      <svg viewBox="0 0 22 22" width={24} height={24}>
                        <path
                          fill={getBadgeDisplayColor(badge)}
                          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                        />
                      </svg>
                    ) : (
                      <span className="text-2xl">{badge.icon}</span>
                    )}
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
                  <div className="shrink-0 flex items-center gap-2">
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

                {/* Color Picker for OG Badge */}
                {badge.id === "og" && isEquipped(badge.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-white/5 border-x border-b border-white/10">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center justify-between text-xs text-white/60 mb-2"
                      >
                        <span className="flex items-center gap-2">
                          <Palette className="w-3 h-3" />
                          Customize Color
                        </span>
                        {showColorPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <AnimatePresence>
                        {showColorPicker && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap gap-2 pt-2">
                              {OG_BADGE_COLORS.map((colorOption) => (
                                <button
                                  key={colorOption.id}
                                  onClick={() => saveOgBadgeColor(colorOption.color)}
                                  title={colorOption.name}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    ogBadgeColor === colorOption.color
                                      ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                                      : "hover:scale-110"
                                  }`}
                                  style={{ backgroundColor: colorOption.color }}
                                >
                                  {ogBadgeColor === colorOption.color && (
                                    <svg viewBox="0 0 24 24" width={14} height={14} fill="white">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                            </div>
                            <p className="text-white/30 text-[9px] mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
                              Pick your badge color
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </div>
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
                          {badge.type === "verified" ? (
                            <svg viewBox="0 0 22 22" width={16} height={16} className="opacity-50">
                              <path
                                fill={badge.color}
                                d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                              />
                            </svg>
                          ) : (
                            <span className="text-lg opacity-50">{badge.icon}</span>
                          )}
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
