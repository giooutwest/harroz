import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Star, Calendar, Flame, MessageCircle, Zap, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInMinutes, differenceInHours } from "date-fns";
import BadgeDisplay from "./BadgeDisplay";
import { useTheme } from "@/hooks/useTheme";

interface FriendProfileModalProps {
  friendId: string | null;
  onClose: () => void;
  onMessage?: (friendId: string, friendName: string, friendAvatar: string | null) => void;
  onFriendRemoved?: () => void;
}

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  current_streak: number | null;
  equipped_badges: string[];
}

interface RecentMood {
  id: string;
  rating: number;
  caption: string | null;
  created_at: string;
}

type ActivityStatus = "active" | "recent" | "inactive";

const getActivityStatus = (lastActivity: string | null): ActivityStatus => {
  if (!lastActivity) return "inactive";
  const now = new Date();
  const lastDate = new Date(lastActivity);
  const minutesAgo = differenceInMinutes(now, lastDate);
  const hoursAgo = differenceInHours(now, lastDate);

  if (minutesAgo < 15) return "active";
  if (hoursAgo < 1) return "recent";
  return "inactive";
};

const getStatusColor = (status: ActivityStatus): string => {
  switch (status) {
    case "active": return "#22c55e"; // green
    case "recent": return "#eab308"; // yellow
    case "inactive": return "#ef4444"; // red
  }
};

const getStatusLabel = (status: ActivityStatus): string => {
  switch (status) {
    case "active": return "ACTIVE";
    case "recent": return "RECENT";
    case "inactive": return "INACTIVE";
  }
};

const getMoodEmoji = (rating: number): string => {
  if (rating <= 2) return "🌧️";
  if (rating <= 4) return "🌦️";
  if (rating <= 6) return "⛅";
  if (rating <= 8) return "🌤️";
  return "☀️";
};

const FriendProfileModal = ({ friendId, onClose, onMessage, onFriendRemoved }: FriendProfileModalProps) => {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([]);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendshipDate, setFriendshipDate] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isStudio } = useTheme();

  useEffect(() => {
    if (friendId && user) {
      fetchProfileData();
    }
  }, [friendId, user]);

  const fetchProfileData = async () => {
    if (!friendId || !user) return;
    setLoading(true);
    setShowSettings(false);
    setConfirmDelete(false);

    // Fetch profile and badges in parallel
    const [{ data: profileData }, { data: badgesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, current_streak')
        .eq('user_id', friendId)
        .maybeSingle(),
      // @ts-ignore
      supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', friendId)
        .eq('is_equipped', true)
    ]);

    if (profileData) {
      const equippedBadges = (badgesData || []).map((b: any) => b.badge_id);
      setProfile({
        ...profileData,
        equipped_badges: equippedBadges
      });
    }

    // Check if close friend
    const { data: closeData } = await supabase
      .from('close_friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .maybeSingle();

    setIsCloseFriend(!!closeData);

    // Get friendship data
    const { data: friendshipData } = await supabase
      .from('friendships')
      .select('id, created_at')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendshipData) {
      setFriendshipId(friendshipData.id);
      setFriendshipDate(friendshipData.created_at);
    }

    // Fetch recent moods (for activity status and display)
    const { data: moodsData } = await supabase
      .from('moods')
      .select('id, rating, caption, created_at')
      .eq('user_id', friendId)
      .in('visibility', ['friends', 'close_friends'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (moodsData && moodsData.length > 0) {
      setRecentMoods(moodsData);
      setLastActivity(moodsData[0].created_at);
    } else {
      setRecentMoods([]);
      setLastActivity(null);
    }

    setLoading(false);
  };

  const handleToggleCloseFriend = async () => {
    if (!user || !friendId) return;

    if (isCloseFriend) {
      const { error } = await supabase
        .from('close_friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      if (!error) {
        setIsCloseFriend(false);
        toast({ title: "Removed from close friends" });
      }
    } else {
      const { error } = await supabase
        .from('close_friends')
        .insert({ user_id: user.id, friend_id: friendId });

      if (!error) {
        setIsCloseFriend(true);
        toast({ title: "Added to close friends!" });
      }
    }
    setShowSettings(false);
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      // Also remove from close friends if applicable
      if (user && friendId) {
        await supabase
          .from('close_friends')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', friendId);
      }
      toast({ title: "Friend removed" });
      onFriendRemoved?.();
      onClose();
    } else {
      toast({ title: "Failed to remove friend", variant: "destructive" });
    }
  };

  const handleNudge = async () => {
    if (!user || !friendId) return;

    // @ts-ignore
    const { error } = await supabase
      .from('nudges')
      .insert({ sender_id: user.id, receiver_id: friendId });

    if (!error) {
      toast({ title: `Nudged ${profile?.display_name || profile?.username}!` });
    } else {
      toast({ title: "Could not send nudge", variant: "destructive" });
    }
  };

  if (!friendId) return null;

  const activityStatus = getActivityStatus(lastActivity);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={isStudio
            ? "bg-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
            : "bg-[#0a0a0a] border border-foreground/10 w-full max-w-sm max-h-[85vh] overflow-y-auto"
          }
          style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
        >
          {/* Header */}
          <div className={isStudio
            ? "border-b border-border p-4 flex items-center justify-between bg-secondary/50 rounded-t-2xl"
            : "border-b border-foreground/10 p-4 flex items-center justify-between bg-[#111]"
          }>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isStudio ? 'text-muted-foreground' : 'text-red-500'}`}>
                {isStudio ? 'Friend Profile' : 'Subject Dossier'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-foreground/5 transition-colors"
              >
                <Settings className="w-4 h-4 text-foreground/40" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-foreground/5 transition-colors"
              >
                <X className="w-4 h-4 text-foreground/40" />
              </button>
            </div>
          </div>

          {/* Settings dropdown */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-foreground/10 overflow-hidden"
              >
                <div className="p-3 space-y-1">
                  <button
                    onClick={handleToggleCloseFriend}
                    className="w-full flex items-center gap-3 p-3 hover:bg-foreground/5 text-left transition-colors"
                  >
                    <Star className={`w-4 h-4 ${isCloseFriend ? "text-[#C5A059] fill-current" : "text-foreground/40"}`} />
                    <span className="text-sm text-foreground/80">
                      {isCloseFriend ? "Remove from Close Friends" : "Add to Close Friends"}
                    </span>
                  </button>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 text-left transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500/60" />
                      <span className="text-sm text-red-500/80">Remove Friend</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400 mb-2">Confirm removal?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRemoveFriend}
                          className="flex-1 py-2 bg-red-500 text-foreground text-xs font-bold"
                        >
                          REMOVE
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2 bg-foreground/10 text-foreground/60 text-xs"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full"
              />
            </div>
          ) : profile ? (
            <div className="p-5 space-y-5">
              {/* Avatar with status indicator */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-foreground/5 border border-foreground/10 flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-foreground/20" />
                    )}
                  </div>
                  {/* Status indicator */}
                  <motion.div
                    animate={{
                      opacity: activityStatus === "active" ? [1, 0.4, 1] : 1,
                      scale: activityStatus === "active" ? [1, 1.1, 1] : 1
                    }}
                    transition={{
                      repeat: activityStatus === "active" ? Infinity : 0,
                      duration: 1.5
                    }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center"
                    style={{ backgroundColor: getStatusColor(activityStatus) }}
                  />
                </div>

                {/* Name and status info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-bold text-lg truncate flex items-center gap-2" style={isStudio ? undefined : { fontFamily: "'Space Grotesk', sans-serif" }}>
                    {profile.display_name || "UNKNOWN"}
                    {profile.equipped_badges && profile.equipped_badges.length > 0 && (
                      <BadgeDisplay badgeIds={profile.equipped_badges} size="md" />
                    )}
                  </h3>
                  {profile.username && (
                    <p className="text-foreground/40 text-xs mb-2">@{profile.username}</p>
                  )}

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5"
                      style={{
                        backgroundColor: `${getStatusColor(activityStatus)}20`,
                        color: getStatusColor(activityStatus)
                      }}
                    >
                      {getStatusLabel(activityStatus)}
                    </span>
                    {isCloseFriend && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#C5A059]/20 text-[#C5A059] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        CLOSE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Streak */}
                <div className="bg-foreground/5 border border-foreground/10 p-3">
                  <div className="flex items-center gap-2 text-orange-500 mb-1">
                    <Flame className="w-4 h-4 fill-current" />
                    <span className="text-[10px] uppercase tracking-wider">Streak</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground" style={isStudio ? undefined : { fontFamily: "'Space Grotesk', sans-serif" }}>
                    {profile.current_streak || 0}
                    <span className="text-xs text-foreground/40 ml-1">days</span>
                  </p>
                </div>

                {/* Friends since */}
                <div className="bg-foreground/5 border border-foreground/10 p-3">
                  <div className="flex items-center gap-2 text-foreground/40 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">Connected</span>
                  </div>
                  <p className="text-sm text-foreground/80">
                    {friendshipDate
                      ? formatDistanceToNow(new Date(friendshipDate), { addSuffix: false })
                      : "Recently"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                {onMessage && (
                  <button
                    onClick={() => {
                      onMessage(profile.user_id, profile.display_name || profile.username || 'Friend', profile.avatar_url);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-[#C5A059] text-black font-bold text-xs uppercase tracking-wider"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </button>
                )}
                <button
                  onClick={handleNudge}
                  className={`flex items-center justify-center gap-2 py-3 border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 font-bold text-xs uppercase tracking-wider hover:bg-yellow-500/20 transition-colors ${!onMessage ? 'col-span-2' : ''}`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Nudge
                </button>
              </div>

              {/* Recent activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-foreground/10" />
                  <span className="text-[10px] text-foreground/30 uppercase tracking-[0.2em]">Recent Intel</span>
                  <div className="h-px flex-1 bg-foreground/10" />
                </div>

                {recentMoods.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-foreground/10">
                    <p className="text-foreground/30 text-xs uppercase tracking-wider">No recent transmissions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentMoods.map((mood) => (
                      <div
                        key={mood.id}
                        className="bg-foreground/5 border border-foreground/10 p-3 flex items-center gap-3"
                      >
                        <span className="text-xl">{getMoodEmoji(mood.rating)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground/80 text-sm font-bold">
                              {mood.rating}/10
                            </span>
                            <span className="text-foreground/30 text-[10px] uppercase">
                              {formatDistanceToNow(new Date(mood.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {mood.caption && (
                            <p className="text-foreground/50 text-xs truncate mt-0.5">
                              {mood.caption}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-foreground/30 text-xs uppercase tracking-wider">Subject not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendProfileModal;
