import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Star, Calendar, Activity, Flame, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface FriendProfileModalProps {
  friendId: string | null;
  onClose: () => void;
  onMessage?: (friendId: string, friendName: string, friendAvatar: string | null) => void;
}

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  current_streak: number | null;
}

interface RecentMood {
  id: string;
  rating: number;
  caption: string | null;
  created_at: string;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const getMoodEmoji = (rating: number): string => {
  if (rating <= 2) return "🌧️";
  if (rating <= 4) return "🌦️";
  if (rating <= 6) return "⛅";
  if (rating <= 8) return "🌤️";
  return "☀️";
};

const FriendProfileModal = ({ friendId, onClose, onMessage }: FriendProfileModalProps) => {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([]);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [friendshipDate, setFriendshipDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (friendId && user) {
      fetchProfileData();
    }
  }, [friendId, user]);

  const fetchProfileData = async () => {
    if (!friendId || !user) return;
    setLoading(true);

    // Fetch profile (Now includes current_streak)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url, current_streak')
      .eq('user_id', friendId)
      .maybeSingle();

    if (profileData) {
      // @ts-ignore
      setProfile(profileData);
    }

    // Check if close friend
    const { data: closeData } = await supabase
      .from('close_friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .maybeSingle();

    setIsCloseFriend(!!closeData);

    // Get friendship date
    const { data: friendshipData } = await supabase
      .from('friendships')
      .select('created_at')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendshipData) {
      setFriendshipDate(friendshipData.created_at);
    }

    // Fetch recent moods (visible to current user)
    const { data: moodsData } = await supabase
      .from('moods')
      .select('id, rating, caption, created_at')
      .eq('user_id', friendId)
      .in('visibility', ['friends', 'close_friends'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (moodsData) {
      setRecentMoods(moodsData);
    }

    setLoading(false);
  };

  if (!friendId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">
              Profile
            </h3>
            <button
              onClick={onClose}
              className="p-2 bg-secondary touch-manipulation rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar & Name */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-secondary flex items-center justify-center overflow-hidden mb-3 rounded-full">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>

                <h4 className="font-bold flex items-center gap-2 text-xl">
                  {profile.display_name || "Unknown"}
                </h4>

                {/* Streak Badge */}
                {profile.current_streak && profile.current_streak > 0 ? (
                  <Badge variant="secondary" className="mt-2 bg-orange-50 text-orange-600 border-orange-100 gap-1.5 px-2 py-0.5">
                    <Flame className="w-3 h-3 fill-orange-500" />
                    <span className="font-bold">{profile.current_streak} Day Streak</span>
                  </Badge>
                ) : null}

                {profile.username && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    @{profile.username}
                  </p>
                )}

                {isCloseFriend && (
                  <div className="flex items-center gap-1 text-primary mt-2 text-sm">
                    <Star className="w-4 h-4 fill-current" />
                    Close Friend
                  </div>
                )}

                {/* Message Button */}
                {onMessage && (
                  <button
                    onClick={() => {
                      onMessage(profile.user_id, profile.display_name || profile.username || 'Friend', profile.avatar_url);
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-4 bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 rounded-xl"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Message
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="bg-secondary p-4 rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Friends since {friendshipDate ? formatDistanceToNow(new Date(friendshipDate), { addSuffix: false }) : "recently"}
                  </span>
                </div>
              </div>

              {/* Recent Moods */}
              <div>
                <h5 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4" />
                  Recent Moods
                </h5>

                {recentMoods.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    No shared moods yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentMoods.map((mood) => (
                      <div
                        key={mood.id}
                        className="bg-secondary p-3 flex items-center gap-3 rounded-xl"
                      >
                        <div
                          className="w-8 h-8 flex items-center justify-center rounded-full"
                          style={{ backgroundColor: getMoodColor(mood.rating) }}
                        >
                          <span className="text-sm">{getMoodEmoji(mood.rating)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold text-sm"
                              style={{ color: getMoodColor(mood.rating) }}
                            >
                              {mood.rating}/10
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(mood.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {mood.caption && (
                            <p className="text-muted-foreground truncate text-xs">
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
            <p className="text-muted-foreground text-center py-8">Profile not found</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendProfileModal;
