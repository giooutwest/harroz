import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Send, Scissors, Film } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useHaptic } from "@/hooks/useHaptic";
import { motion, AnimatePresence } from "framer-motion";
import BadgeDisplay from "./BadgeDisplay";

// --- Types ---
interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number | null;
  equipped_badges?: string[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: Profile;
  likes_count: number;
  has_liked: boolean;
  parent_id?: string | null;
  replies?: Comment[];
}

interface Mood {
  id: string;
  user_id: string;
  rating: number;
  note: string | null;
  photo_url: string | null;
  created_at: string;
  user: Profile;
  comments: Comment[];
  likes_count: number;
  has_liked: boolean;
  comments_count: number;
  reaction_type: string | null;
  type: 'mood';
}

interface FitCheck {
  id: string;
  user_id: string;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
  user: Profile;
  type: 'fitcheck';
}

type FeedItem = Mood | FitCheck;

interface DailyReelProps {
  onFriendClick?: (id: string) => void;
  highlightMoodId?: string | null;
  highlightCommentId?: string | null;
  onClearHighlight?: () => void;
  shouldOpenComments?: boolean;
  closeFriendsOnly?: boolean;
  communityBadgeIds?: string[]; // Filter to users with any of these equipped badges
}

const REACTIONS = [
  { type: 'heart', emoji: '❤️' },
  { type: 'fire', emoji: '🔥' },
  { type: 'hug', emoji: '🫂' },
  { type: 'flex', emoji: '💪' },
  { type: 'star', emoji: '🌟' },
];

const DailyReel = ({ onFriendClick, highlightMoodId, shouldOpenComments, closeFriendsOnly, communityBadgeIds }: DailyReelProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ moodId: string; commentId: string; username: string } | null>(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { trigger: haptic } = useHaptic();

  // Track scroll position to update active frame
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const frameHeight = 520; // Approximate height of each frame
      const newIndex = Math.round(scrollTop / frameHeight);
      if (newIndex !== activeFrameIndex && newIndex >= 0 && newIndex < feedItems.length) {
        setActiveFrameIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeFrameIndex, feedItems.length]);

  const fetchFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, current_streak')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        setCurrentUserProfile(userProfile);
      }

      let friendIds: string[];

      if (communityBadgeIds && communityBadgeIds.length > 0) {
        // Community mode: Get all users who have any of the specified badges equipped
        // @ts-ignore
        const { data: badgeUsers } = await supabase
          .from('user_badges')
          .select('user_id')
          .in('badge_id', communityBadgeIds)
          .eq('is_equipped', true);

        friendIds = badgeUsers?.map(b => b.user_id) || [];
        // Include self
        if (!friendIds.includes(user.id)) {
          friendIds.push(user.id);
        }
      } else if (closeFriendsOnly) {
        const { data: closeFriendsList } = await supabase
          .from('close_friends')
          .select('friend_id')
          .eq('user_id', user.id);

        friendIds = closeFriendsList?.map(cf => cf.friend_id) || [];
        friendIds.push(user.id);
      } else {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        friendIds = friendships?.map(f =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ) || [];

        friendIds.push(user.id);
      }

      if (friendIds.length === 0) {
        setFeedItems([]);
        setLoading(false);
        return;
      }

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayISO = yesterday.toISOString();

      let query = supabase
        .from('moods')
        .select(`
          id, rating, note:caption, photo_url, created_at, user_id,
          user:profiles!moods_user_id_fkey(user_id, username, display_name, avatar_url, current_streak)
        `)
        .in('user_id', friendIds)
        .gte('created_at', yesterdayISO);

      // Both feeds show friends + close_friends visibility
      // RLS handles permission checks for close_friends visibility posts
      query = query.in('visibility', ['friends', 'close_friends']);

      const { data: moodData, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const moodIds = moodData.map((m: any) => m.id);

      const { data: allMoodLikes } = await supabase
        .from('mood_likes')
        // @ts-ignore
        .select('mood_id, user_id, reaction_type')
        .in('mood_id', moodIds);

      const { data: allComments } = await supabase
        .from('mood_comments')
        .select(`
          id, content, created_at, user_id, parent_id, mood_id,
          user:profiles(user_id, username, display_name, avatar_url, current_streak)
        `)
        .in('mood_id', moodIds)
        .order('created_at', { ascending: true });

      const commentIds = (allComments || []).map((c: any) => c.id);

      const { data: allCommentLikes } = commentIds.length > 0
        ? await supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', commentIds)
        : { data: [] };

      const likesCountByMood = new Map<string, number>();
      const userLikeByMood = new Map<string, any>();
      (allMoodLikes || []).forEach((like: any) => {
        likesCountByMood.set(like.mood_id, (likesCountByMood.get(like.mood_id) || 0) + 1);
        if (like.user_id === user.id) {
          userLikeByMood.set(like.mood_id, like);
        }
      });

      const commentsByMood = new Map<string, any[]>();
      (allComments || []).forEach((c: any) => {
        const moodComments = commentsByMood.get(c.mood_id) || [];
        moodComments.push(c);
        commentsByMood.set(c.mood_id, moodComments);
      });

      const commentLikesCount = new Map<string, number>();
      const userCommentLikes = new Set<string>();
      (allCommentLikes || []).forEach((cl: any) => {
        commentLikesCount.set(cl.comment_id, (commentLikesCount.get(cl.comment_id) || 0) + 1);
        if (cl.user_id === user.id) {
          userCommentLikes.add(cl.comment_id);
        }
      });

      // Fetch equipped badges for all users in the feed
      const userIdsInFeed = [...new Set(moodData.map((m: any) => m.user_id))];
      // @ts-ignore
      const { data: allBadges } = await supabase
        .from('user_badges')
        .select('user_id, badge_id')
        .in('user_id', userIdsInFeed)
        .eq('is_equipped', true);

      const badgesByUser = new Map<string, string[]>();
      (allBadges || []).forEach((b: any) => {
        const userBadges = badgesByUser.get(b.user_id) || [];
        userBadges.push(b.badge_id);
        badgesByUser.set(b.user_id, userBadges);
      });

      const moodsWithDetails: Mood[] = await Promise.all(moodData.map(async (m: any) => {
        let signedPhotoUrl = null;
        if (m.photo_url) {
          try {
            const { data: signedData, error: signedError } = await supabase.storage
              .from('mood-photos')
              .createSignedUrl(m.photo_url, 3600);
            if (!signedError && signedData?.signedUrl) {
              signedPhotoUrl = signedData.signedUrl;
            }
          } catch (err) {
            console.warn('Failed to generate signed URL for photo:', m.photo_url);
          }
        }

        const moodLikesCount = likesCountByMood.get(m.id) || 0;
        const myMoodLike = userLikeByMood.get(m.id);
        const moodComments = commentsByMood.get(m.id) || [];

        const commentsWithLikes = moodComments.map((c: any) => ({
          ...c,
          parent_id: c.parent_id || null,
          likes_count: commentLikesCount.get(c.id) || 0,
          has_liked: userCommentLikes.has(c.id)
        }));

        if (highlightMoodId && m.id === highlightMoodId && shouldOpenComments) {
          setOpenComments(prev => ({ ...prev, [m.id]: true }));
        }

        return {
          ...m,
          note: m.note,
          photo_url: signedPhotoUrl,
          likes_count: moodLikesCount,
          has_liked: !!myMoodLike,
          reaction_type: myMoodLike?.reaction_type || null,
          comments_count: commentsWithLikes.length,
          comments: commentsWithLikes,
          type: 'mood' as const,
          user: {
            ...m.user,
            equipped_badges: badgesByUser.get(m.user_id) || []
          }
        };
      }));

      let fitChecksWithDetails: FitCheck[] = [];
      if (!closeFriendsOnly) {
        // @ts-ignore
        const { data: fitCheckData } = await supabase
          .from('fit_checks')
          .select(`
            id, photo_url, caption, created_at, user_id,
            user:profiles!fit_checks_user_id_fkey(user_id, username, display_name, avatar_url, current_streak)
          `)
          .in('user_id', friendIds)
          .eq('visibility', 'friends')
          .gte('created_at', yesterdayISO)
          .order('created_at', { ascending: false })
          .limit(10);

        if (fitCheckData) {
          fitChecksWithDetails = await Promise.all(fitCheckData.map(async (fc: any) => {
            let signedPhotoUrl = null;
            if (fc.photo_url) {
              try {
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('mood-photos')
                  .createSignedUrl(fc.photo_url, 3600);
                if (!signedError && signedData?.signedUrl) {
                  signedPhotoUrl = signedData.signedUrl;
                }
              } catch (err) {
                console.warn('Failed to generate signed URL for fit check:', fc.photo_url);
              }
            }

            return {
              ...fc,
              photo_url: signedPhotoUrl,
              type: 'fitcheck' as const
            };
          }));
        }
      }

      // Merge and sort - put user's own posts first (Frame 001)
      const allItems: FeedItem[] = [...moodsWithDetails, ...fitChecksWithDetails]
        .sort((a, b) => {
          // Current user's posts come first
          if (a.user_id === user.id && b.user_id !== user.id) return -1;
          if (a.user_id !== user.id && b.user_id === user.id) return 1;
          // Then sort by date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      setFeedItems(allItems);

    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Could not load reel.");
    } finally {
      setLoading(false);
    }
  }, [highlightMoodId, shouldOpenComments, closeFriendsOnly, communityBadgeIds]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleReaction = async (moodId: string, type: string) => {
    if (!currentUser) return;
    setShowReactionMenu(null);
    haptic('success');

    setFeedItems(prev => prev.map(item => {
      if (item.type === 'mood' && item.id === moodId) {
        const m = item as Mood;
        const wasLiked = m.has_liked;
        const newCount = wasLiked ? m.likes_count : m.likes_count + 1;
        return { ...m, has_liked: true, likes_count: newCount, reaction_type: type };
      }
      return item;
    }));

    try {
      // @ts-ignore
      await supabase.from('mood_likes').upsert({ mood_id: moodId, user_id: currentUser, reaction_type: type }, { onConflict: 'mood_id,user_id' });
    } catch (err) { fetchFeed(); }
  };

  const handleRemoveLike = async (moodId: string) => {
    if (!currentUser) return;
    haptic('light');

    setFeedItems(prev => prev.map(item => {
      if (item.type === 'mood' && item.id === moodId) {
        const m = item as Mood;
        return { ...m, has_liked: false, likes_count: m.likes_count - 1, reaction_type: null };
      }
      return item;
    }));

    await supabase.from('mood_likes').delete().eq('mood_id', moodId).eq('user_id', currentUser);
  };

  const handlePostComment = async (moodId: string) => {
    const text = commentText[moodId];
    if (!text?.trim() || !currentUser || !currentUserProfile) return;
    haptic('success');

    const trimmedText = text.trim();
    const parentId = replyingTo?.moodId === moodId ? replyingTo.commentId : null;

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: trimmedText,
      created_at: new Date().toISOString(),
      user_id: currentUser,
      user: currentUserProfile,
      likes_count: 0,
      has_liked: false,
      parent_id: parentId,
    };

    setFeedItems(prev => prev.map(item => {
      if (item.type === 'mood' && item.id === moodId) {
        const m = item as Mood;
        return {
          ...m,
          comments: [...m.comments, optimisticComment],
          comments_count: m.comments_count + 1,
        };
      }
      return item;
    }));

    setCommentText(prev => ({ ...prev, [moodId]: "" }));
    setReplyingTo(null);

    try {
      const insertData: { mood_id: string; user_id: string; content: string; parent_id?: string } = {
        mood_id: moodId,
        user_id: currentUser,
        content: trimmedText,
      };
      if (parentId) {
        insertData.parent_id = parentId;
      }

      const { data, error } = await supabase
        .from('mood_comments')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      if (data) {
        setFeedItems(prev => prev.map(item => {
          if (item.type === 'mood' && item.id === moodId) {
            const m = item as Mood;
            return {
              ...m,
              comments: m.comments.map(c =>
                c.id === optimisticComment.id ? { ...c, id: data.id } : c
              ),
            };
          }
          return item;
        }));
      }

      toast.success("Comment posted!");
    } catch (err) {
      setFeedItems(prev => prev.map(item => {
        if (item.type === 'mood' && item.id === moodId) {
          const m = item as Mood;
          return {
            ...m,
            comments: m.comments.filter(c => c.id !== optimisticComment.id),
            comments_count: m.comments_count - 1,
          };
        }
        return item;
      }));
      toast.error("Failed to post comment");
    }
  };

  const handleLikeComment = async (commentId: string, hasLiked: boolean) => {
    if (!currentUser) return;
    haptic('light');

    setFeedItems(prev => prev.map(item => {
      if (item.type !== 'mood') return item;
      const m = item as Mood;
      return {
        ...m,
        comments: m.comments.map(c => {
          if (c.id === commentId) {
            return { ...c, has_liked: !hasLiked, likes_count: hasLiked ? c.likes_count - 1 : c.likes_count + 1 };
          }
          return c;
        })
      };
    }));

    try {
      if (hasLiked) await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUser);
      else await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser });
    } catch (err) { fetchFeed(); }
  };

  const getReactionEmoji = (type: string | null) => {
    return REACTIONS.find(r => r.type === type)?.emoji || <Heart className="w-4 h-4 fill-current" />;
  };

  // Generate random ISO value for each frame (seeded by index for consistency)
  const getISO = (index: number) => {
    const isoValues = [100, 200, 400, 800, 1600, 3200];
    return isoValues[index % isoValues.length];
  };

  // Render a single film frame
  const renderFilmFrame = (item: FeedItem, index: number) => {
    const isMood = item.type === 'mood';
    const mood = isMood ? item as Mood : null;
    const fitCheck = !isMood ? item as FitCheck : null;
    const frameNumber = String(index + 1).padStart(3, '0');
    const time = format(new Date(item.created_at), 'HH:mm');
    const iso = getISO(index);
    const isOwnPost = item.user_id === currentUser;

    const handleLike = () => {
      if (!mood) return;
      if (mood.has_liked) {
        handleRemoveLike(mood.id);
      } else {
        setShowReactionMenu(mood.id);
      }
    };

    const handleComment = () => {
      haptic('light');
      setOpenComments(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    };

    return (
      <div
        key={item.id}
        ref={el => { frameRefs.current[index] = el; }}
        className="film-frame relative snap-start"
        style={{ scrollSnapAlign: 'start' }}
      >
        {/* Splice line (jagged separator) - not on first frame */}
        {index > 0 && (
          <div className="relative h-8 flex items-center justify-center overflow-hidden">
            <div className="splice-line w-full" />
            <Scissors className="absolute w-4 h-4 text-white/20 -rotate-90" />
          </div>
        )}

        {/* Frame content */}
        <div className="relative px-2 py-4">
          {/* Technical metadata strip */}
          <div className="flex items-center justify-between mb-3 px-3">
            <div className="flex items-center gap-4">
              <span
                className="text-white/50 text-[10px] tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                FRAME: {frameNumber}
              </span>
              <span
                className="text-white/50 text-[10px] tracking-[0.15em]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                TIME: {time}
              </span>
            </div>
            <span
              className="text-white/50 text-[10px] tracking-[0.15em]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              ISO: {iso}
            </span>
          </div>

          {/* Director credit */}
          <div className="mb-4 px-3">
            <button
              onClick={() => onFriendClick?.(item.user.user_id)}
              className="group flex items-center gap-3"
            >
              <span
                className="text-white/40 text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Director:
              </span>
              <span
                className="text-white text-xl group-hover:text-[#C5A059] transition-colors flex items-center gap-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {item.user.display_name || item.user.username}
                {item.user.equipped_badges && item.user.equipped_badges.length > 0 && (
                  <BadgeDisplay badgeIds={item.user.equipped_badges} size="md" />
                )}
              </span>
              {isOwnPost && (
                <span
                  className="text-[#C5A059] text-[9px] uppercase tracking-wider px-2 py-0.5 border border-[#C5A059]/40"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  YOU
                </span>
              )}
              {item.user.current_streak && item.user.current_streak > 0 && (
                <span className="text-orange-500 text-sm">🔥{item.user.current_streak}</span>
              )}
            </button>
          </div>

          {/* Photo frame with film perforations */}
          <div className="relative mx-3">
            {/* Sprocket holes - left side */}
            <div className="absolute -left-4 top-0 bottom-0 w-3 flex flex-col justify-around py-2 z-10">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-5 rounded-sm bg-[#050505] border border-white/15"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
                />
              ))}
            </div>

            {/* Sprocket holes - right side */}
            <div className="absolute -right-4 top-0 bottom-0 w-3 flex flex-col justify-around py-2 z-10">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-5 rounded-sm bg-[#050505] border border-white/15"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
                />
              ))}
            </div>

            {/* Main photo area */}
            <div className="relative aspect-[4/5] bg-black/90 border border-white/10 overflow-hidden">
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt="Frame"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                  {mood?.rating && (
                    <span
                      className="text-9xl text-white/5"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {mood.rating}
                    </span>
                  )}
                </div>
              )}

              {/* Vibe rating badge */}
              {mood?.rating && (
                <div
                  className="absolute top-3 right-3 bg-white text-black px-3 py-1.5"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <span className="text-xs font-bold tracking-tight">{mood.rating}/10</span>
                </div>
              )}

              {/* Fit check badge */}
              {fitCheck && (
                <div
                  className="absolute top-3 right-3 bg-purple-500 text-white px-3 py-1.5 text-[10px] uppercase tracking-wider"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  FIT CHECK
                </div>
              )}

              {/* Film edge burn effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
                {/* Vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Caption */}
          {(mood?.note || fitCheck?.caption) && (
            <p
              className="text-white/60 text-base mt-4 px-4 italic line-clamp-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              "{mood?.note || fitCheck?.caption}"
            </p>
          )}

          {/* Actions bar */}
          {mood && (
            <div className="flex items-center justify-between mt-4 px-4">
              <div className="flex items-center gap-5">
                {/* Like button */}
                <motion.button
                  onClick={handleLike}
                  whileTap={{ scale: 0.9 }}
                  className={`flex items-center gap-2 ${mood.has_liked ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
                >
                  {mood.has_liked ? (
                    <span className="text-xl">{getReactionEmoji(mood.reaction_type)}</span>
                  ) : (
                    <Heart className="w-5 h-5" />
                  )}
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {mood.likes_count > 0 ? mood.likes_count : 'REACT'}
                  </span>
                </motion.button>

                {/* Comment button */}
                <button
                  onClick={handleComment}
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {mood.comments_count > 0 ? mood.comments_count : 'NOTE'}
                  </span>
                </button>
              </div>

              {/* Cut icon */}
              <Scissors className="w-4 h-4 text-white/20" />
            </div>
          )}

          {/* Reaction menu */}
          <AnimatePresence>
            {mood && showReactionMenu === mood.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowReactionMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 flex items-center gap-1 bg-black/95 border border-white/20 rounded-full p-2 shadow-2xl backdrop-blur-sm"
                >
                  {REACTIONS.map((r) => (
                    <button
                      key={r.type}
                      onClick={(e) => { e.stopPropagation(); handleReaction(mood.id, r.type); }}
                      className="w-11 h-11 flex items-center justify-center text-2xl hover:scale-125 transition-transform active:scale-95"
                    >
                      {r.emoji}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Comments panel */}
          <AnimatePresence>
            {mood && openComments[mood.id] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 mx-3 bg-black/70 border border-white/10 p-3 backdrop-blur-sm"
              >
                <div className="space-y-2">
                  {mood.comments.length === 0 ? (
                    <p
                      className="text-white/30 text-[10px] text-center py-3 uppercase tracking-wider"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      NO NOTES YET
                    </p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto no-scrollbar space-y-2">
                      {mood.comments
                        .filter(c => !c.parent_id)
                        .slice(0, 5)
                        .map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="w-5 h-5 shrink-0">
                              {comment.user.avatar_url && <AvatarImage src={comment.user.avatar_url} />}
                              <AvatarFallback className="text-[8px] bg-white/10">{comment.user.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span
                                className="text-white/70 text-[10px] font-medium"
                                style={{ fontFamily: "'Space Mono', monospace" }}
                              >
                                {comment.user.display_name || comment.user.username}
                              </span>
                              <p className="text-white/50 text-[11px] leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                    <Input
                      ref={(el) => { commentInputRefs.current[mood.id] = el; }}
                      placeholder="Add a note..."
                      className="h-8 text-[11px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      value={commentText[mood.id] || ""}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [mood.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(mood.id); }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-white/10 hover:bg-white/20 shrink-0"
                      onClick={() => handlePostComment(mood.id)}
                      disabled={!commentText[mood.id]?.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative min-h-[60vh] bg-[#050505] flex items-center justify-center -mx-4 -mt-6">
        <div className="text-center">
          <Film className="w-12 h-12 text-white/20 mx-auto mb-4 animate-pulse" />
          <p
            className="text-white/40 text-[10px] tracking-[0.2em] uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Loading reel...
          </p>
        </div>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="relative min-h-[60vh] bg-[#050505] flex items-center justify-center -mx-4 -mt-6">
        <div className="text-center px-8">
          <div className="relative inline-block mb-6">
            <Film className="w-16 h-16 text-white/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/20 text-2xl">?</span>
            </div>
          </div>
          <h2
            className="text-white/70 text-xl mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            No Frames Today
          </h2>
          <p
            className="text-white/30 text-[10px] tracking-[0.15em] uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            The reel is empty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 -mt-6 bg-[#050505]">
      {/* Static noise/grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-30 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Scrollable film strip container */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-y-auto overflow-x-hidden no-scrollbar pb-28"
        style={{
          scrollSnapType: 'y proximity',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Glow effect under the strip */}
        <div className="absolute inset-x-0 top-0 bottom-0 flex justify-center pointer-events-none">
          <div
            className="w-[90%] max-w-[400px] h-full"
            style={{
              boxShadow: '0 0 80px 30px rgba(255,255,255,0.02), 0 0 120px 50px rgba(255,255,255,0.015)',
            }}
          />
        </div>

        {/* The film strip */}
        <div className="relative mx-auto w-[90%] max-w-[380px]">
          {/* Film strip side borders */}
          <div
            className="absolute left-0 top-0 bottom-0 w-5 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to right, rgba(255,255,255,0.03) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-5 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to left, rgba(255,255,255,0.03) 0%, transparent 100%)',
            }}
          />

          {/* Film frames */}
          <div className="relative z-10">
            {feedItems.map((item, index) => renderFilmFrame(item, index))}
          </div>

          {/* End of reel marker */}
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="splice-line w-24 mb-6" />
            <p
              className="text-white/25 text-[10px] tracking-[0.25em] uppercase mb-1"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              END OF REEL
            </p>
            <p
              className="text-white/15 text-[9px] tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {feedItems.length} FRAME{feedItems.length !== 1 ? 'S' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Frame indicator - floating at bottom */}
      <div className="sticky bottom-24 flex justify-center pointer-events-none z-40">
        <div
          className="bg-black/90 border border-white/15 px-4 py-2 backdrop-blur-md"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <span className="text-white/50 text-[10px] tracking-[0.1em]">
            FRAME {String(activeFrameIndex + 1).padStart(3, '0')} / {String(feedItems.length).padStart(3, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DailyReel;
