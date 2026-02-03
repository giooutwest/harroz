import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, Tag, ChevronDown, ChevronUp, Zap, Award, Share2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { APP_VERSION } from "@/lib/appVersion";

interface Update {
  id: string;
  title: string;
  description: string;
  version: string | null;
  created_at: string;
}

const V4_CHANGELOG = [
  { icon: "🏆", title: "Badge System Overhaul", description: "Equip ONE badge to display on your profile, feed posts, and comments. Complete quests to unlock rare badges!" },
  { icon: "📊", title: "Activity Insights", description: "New analytics showing how your daily activities correlate with your mood over time." },
  { icon: "🔗", title: "Referral System", description: "Invite friends with your unique code. Find it in Settings > Invite Friends." },
  { icon: "✨", title: "OG Badge", description: "Early supporters automatically receive the legendary OG badge as a thank you." },
  { icon: "🎨", title: "UI Improvements", description: "Refreshed settings layout and smoother animations throughout the app." },
];

const UpdatesTab = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullChangelog, setShowFullChangelog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchUpdates();
    markAsRead();
  }, [user]);

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from('app_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setUpdates(data);
    }
    setLoading(false);
  };

  const markAsRead = async () => {
    if (!user) return;

    await supabase
      .from('user_update_reads')
      .upsert(
        { user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Featured v4.0 Update */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-gradient-to-br from-[#C5A059]/20 to-[#C5A059]/5 border border-[#C5A059]/30"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-white font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
              v4.0 - Major Update
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-[#C5A059]/20 text-[#C5A059] text-[10px] uppercase" style={{ fontFamily: "'Space Mono', monospace" }}>
            New
          </span>
        </div>

        <p className="text-white/70 text-sm mb-3">
          Badges, activity insights, referrals, and more!
        </p>

        <button
          onClick={() => setShowFullChangelog(!showFullChangelog)}
          className="w-full flex items-center justify-between py-2 text-[#C5A059] text-xs"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span>{showFullChangelog ? "Hide details" : "View full changelog"}</span>
          {showFullChangelog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showFullChangelog && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3 border-t border-white/10">
                {V4_CHANGELOG.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-3"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-white/50 text-xs">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Current Version Display */}
      <div className="flex items-center justify-center p-3 bg-white/5 border border-white/10">
        <Tag className="w-4 h-4 mr-2 text-white/40" />
        <span className="text-white/60 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
          Running v{APP_VERSION}
        </span>
      </div>

      {/* Previous Updates */}
      {updates.length > 0 && (
        <div>
          <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
            Previous_Updates
          </h4>
          {updates.map((update, index) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-white/5 border border-white/10 mb-2"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/10">
                  <Sparkles className="w-3 h-3 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {update.title}
                    </h4>
                    {update.version && (
                      <span className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[10px]">
                        v{update.version}
                      </span>
                    )}
                  </div>
                  <p className="text-white/50 text-xs">
                    {update.description}
                  </p>
                  <div className="flex items-center gap-1 text-white/30 mt-2">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">
                      {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatesTab;
