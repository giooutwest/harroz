import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Check, Lock, Share2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useBadges, BADGES, Badge } from "@/hooks/useBadges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BadgesSection = () => {
  const { earnedBadges, progress, loading, referralCode, toggleEquipped, applyReferralCode } = useBadges();
  const [referralInput, setReferralInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [showQuests, setShowQuests] = useState(true);
  const { toast } = useToast();

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Copied!", description: "Share this code with friends" });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    setIsApplying(true);
    const result = await applyReferralCode(referralInput.trim());
    setIsApplying(false);

    if (result.success) {
      toast({ title: result.message });
      setReferralInput("");
    } else {
      toast({ title: result.message, variant: "destructive" });
    }
  };

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
      {/* Your Referral Code */}
      <div className="p-4 bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-[#C5A059]" />
          <span className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
            Your_Referral_Code
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-white/10 border border-white/20 px-3 py-2 flex items-center justify-between">
            <span className="text-white font-bold tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
              {referralCode || "..."}
            </span>
            <button onClick={handleCopyReferral} className="p-1 hover:bg-white/10">
              <Copy className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
        <p className="text-white/40 text-xs mt-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          Share with friends to unlock Community Champion!
        </p>
      </div>

      {/* Apply Referral Code */}
      <div className="p-4 bg-white/5 border border-white/10">
        <p className="text-white/60 text-xs mb-2" style={{ fontFamily: "'Space Mono', monospace" }}>
          Have a friend's code?
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter code"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          />
          <Button
            onClick={handleApplyReferral}
            disabled={!referralInput.trim() || isApplying}
            size="sm"
            className="bg-[#C5A059] text-black hover:bg-[#C5A059]/80"
          >
            {isApplying ? "..." : "Apply"}
          </Button>
        </div>
      </div>

      {/* Equipped Badges */}
      {earnedBadgesList.length > 0 && (
        <div>
          <h5 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
            Your_Badges ({earnedBadgesList.length})
          </h5>
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
