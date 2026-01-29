import { useEffect, useState, useCallback, useRef, RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Flame, Send, Shirt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useHaptic } from "@/hooks/useHaptic";
import { motion, AnimatePresence } from "framer-motion";
import ZineFeedPost from "./ZineFeedPost";

// --- Types ---
interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number | null;
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

interface FriendsFeedProps {
  onFriendClick?: (id: string) => void;
  highlightMoodId?: string | null;
  highlightCommentId?: string | null;
  onClearHighlight?: () => void;
  shouldOpenComments?: boolean;
  closeFriendsOnly?: boolean;
}

const REACTIONS = [
  { type: 'heart', emoji: '❤️' },
  { type: 'fire', emoji: '🔥' },
  { type: 'hug', emoji: '🫂' },
  { type: 'flex', emoji: '💪' },
  { type: 'star', emoji: '🌟' },
];

// --- Custom Hook for Long Press ---
function useLongPress(callback: () => void, onClick: () => void, ms = 500) {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (startLongPress) {
      timerRef.current = setTimeout(() => {
        callback();
        setStartLongPress(false);
      }, ms);
    } else {
      clearTimeout(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [startLongPress, callback, ms]);

  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => {
      if (startLongPress) { onClick(); }
      setStartLongPress(false);
    },
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => {
      if (startLongPress) { onClick(); }
      setStartLongPress(false);
    }
  };
}

const FriendsFeed = ({ onFriendClick, highlightMoodId, shouldOpenComments, closeFriendsOnly }: FriendsFeedProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ moodId: string; commentId: string; username: string } | null>(null);
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { trigger: haptic } = useHaptic();

  const fetchFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // Fetch current user's profile for optimistic updates
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, current_streak')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        setCurrentUserProfile(userProfile);
      }

      let friendIds: string[];

      if (closeFriendsOnly) {
        // Get only close friends
        const { data: closeFriendsList } = await supabase
          .from('close_friends')
          .select('friend_id')
          .eq('user_id', user.id);

        friendIds = closeFriendsList?.map(cf => cf.friend_id) || [];
        friendIds.push(user.id); // Include own posts
      } else {
        // Get all friends
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

      // Calculate date range: only show today and yesterday
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Start of yesterday

      const yesterdayISO = yesterday.toISOString();

      let query = supabase
        .from('moods')
        .select(`
          id, rating, note:caption, photo_url, created_at, user_id,
          user:profiles!moods_user_id_fkey(user_id, username, display_name, avatar_url, current_streak)
        `)
        .in('user_id', friendIds)
        .gte('created_at', yesterdayISO); // Only moods from yesterday onwards

      // Filter by visibility based on whether we're showing close friends only
      if (closeFriendsOnly) {
        // Close friends feed: show ONLY close_friends visibility posts
        query = query.eq('visibility', 'close_friends');
      } else {
        // Regular friends feed: show both friends and close_friends visibility posts
        query = query.in('visibility', ['friends', 'close_friends']);
      }

      const { data: moodData, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const moodsWithDetails: Mood[] = await Promise.all(moodData.map(async (m: any) => {

        // Get signed URL for photo if it exists
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

        const { count: moodLikesCount } = await supabase
          .from('mood_likes')
          .select('*', { count: 'exact', head: true })
          .eq('mood_id', m.id);

        // 🔥 FIXED: Explicit cast to bypass TS error on 'reaction_type'
        const { data: myMoodLike } = await supabase
          .from('mood_likes')
          // @ts-ignore
          .select('reaction_type')
          .eq('mood_id', m.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: comments } = await supabase
          .from('mood_comments')
          .select(`
            id, content, created_at, user_id, parent_id,
            user:profiles(user_id, username, display_name, avatar_url, current_streak)
          `)
          .eq('mood_id', m.id)
          .order('created_at', { ascending: true });

        const commentsWithLikes = await Promise.all((comments || []).map(async (c: any) => {
          const { count: commentLikesCount } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', c.id);
          const { data: myCommentLike } = await supabase.from('comment_likes').select('id').eq('comment_id', c.id).eq('user_id', user.id).maybeSingle();

          return {
            ...c,
            parent_id: c.parent_id || null,
            likes_count: commentLikesCount || 0,
            has_liked: !!myCommentLike
          };
        }));

        if (highlightMoodId && m.id === highlightMoodId && shouldOpenComments) {
           setOpenComments(prev => ({ ...prev, [m.id]: true }));
        }

        return {
          ...m,
          note: m.note,
          photo_url: signedPhotoUrl,
          likes_count: moodLikesCount || 0,
          has_liked: !!myMoodLike,
          reaction_type: (myMoodLike as any)?.reaction_type || null,
          comments_count: commentsWithLikes.length,
          comments: commentsWithLikes,
          type: 'mood' as const
        };
      }));

      // Fetch fit checks from friends (only if not close friends only view)
      let fitChecksWithDetails: FitCheck[] = [];
      if (!closeFriendsOnly) {
        // @ts-ignore - fit_checks table
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
            // Get signed URL for fit check photo
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

      // Merge and sort by created_at
      const allItems: FeedItem[] = [...moodsWithDetails, ...fitChecksWithDetails]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFeedItems(allItems);

    } catch (error) {
      console.error("Error fetching feed:", error);
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      toast.error("Could not load feed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }, [highlightMoodId, shouldOpenComments, closeFriendsOnly]);

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
      // 🔥 FIXED: Ignore type check for upserting reaction_type
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

    // Create optimistic comment
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

    // Optimistically update the UI
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

    // Clear input and reply state
    setCommentText(prev => ({ ...prev, [moodId]: "" }));
    setReplyingTo(null);

    try {
      // Build insert object - only include parent_id if it's a reply
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

      // Update the temp ID with the real ID
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
      // Rollback optimistic update on error
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

  const handleRefresh = async () => { haptic('medium'); await fetchFeed(); };

  const getReactionEmoji = (type: string | null) => {
    return REACTIONS.find(r => r.type === type)?.emoji || <Heart className="w-4 h-4 fill-current" />;
  };

  const LikeButton = ({ mood }: { mood: Mood }) => {
    const longPressEvents = useLongPress(
      () => { haptic('medium'); setShowReactionMenu(mood.id); },
      () => { if (mood.has_liked) handleRemoveLike(mood.id); else setShowReactionMenu(mood.id); },
      500
    );

    return (
      <button {...longPressEvents} className={`flex items-center gap-1.5 text-xs transition-colors p-2 -ml-2 rounded-lg active:bg-secondary ${mood.has_liked ? "text-red-500 font-bold" : "text-muted-foreground hover:text-red-500"}`}>
        {mood.has_liked ? <span className="text-lg leading-none">{getReactionEmoji(mood.reaction_type)}</span> : <Heart className="w-4 h-4" />}
        <span>{mood.likes_count > 0 ? mood.likes_count : "Like"}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8 px-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative bg-[#1a1a1a] border border-white/10 p-3 mx-auto max-w-[320px] shadow-xl">
            <div className="absolute -top-3 left-1/4 w-12 h-5 bg-[#C5A059]/70 z-10" style={{ transform: "rotate(3deg)" }} />
            <Skeleton className="aspect-square w-full bg-white/10" />
            <div className="pt-3 pb-1 space-y-2">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-3 w-full bg-white/10" />
              <Skeleton className="h-3 w-16 bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render a mood card using ZineFeedPost
  const renderMoodCard = (mood: Mood) => {
    const handleLike = () => {
      if (mood.has_liked) {
        handleRemoveLike(mood.id);
      } else {
        setShowReactionMenu(mood.id);
      }
    };

    const handleComment = () => {
      haptic('light');
      setOpenComments(prev => ({ ...prev, [mood.id]: !prev[mood.id] }));
    };

    return (
      <div key={mood.id} className="relative">
        <ZineFeedPost
          id={mood.id}
          username={mood.user.username || "user"}
          displayName={mood.user.display_name}
          avatarUrl={mood.user.avatar_url}
          photoUrl={mood.photo_url}
          caption={mood.note}
          rating={mood.rating}
          likesCount={mood.likes_count}
          commentsCount={mood.comments_count}
          hasLiked={mood.has_liked}
          createdAt={mood.created_at}
          streak={mood.user.current_streak || 0}
          type="mood"
          onLike={handleLike}
          onComment={handleComment}
          onPhotoClick={() => {}}
          onUserClick={() => onFriendClick?.(mood.user.user_id)}
        />

        {/* Reaction menu overlay */}
        <AnimatePresence>
          {showReactionMenu === mood.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowReactionMenu(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 flex items-center gap-1 bg-black/90 border border-white/20 rounded-full p-2 shadow-2xl"
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r.type}
                    onClick={(e) => { e.stopPropagation(); handleReaction(mood.id, r.type); }}
                    className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform active:scale-95"
                  >
                    {r.emoji}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Comments section */}
        <AnimatePresence>
          {(openComments[mood.id] || (shouldOpenComments && highlightMoodId === mood.id)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-auto max-w-[320px] -mt-4 pt-6 bg-[#1a1a1a] border border-white/10 border-t-0 px-3 pb-3"
            >
              <div className="space-y-3">
                {mood.comments.length === 0 ? (
                  <p className="text-white/40 text-xs text-center py-2">No comments yet. Be the first!</p>
                ) : (
                  mood.comments
                    .filter(c => !c.parent_id)
                    .map((comment) => {
                      const replies = mood.comments.filter(c => c.parent_id === comment.id);
                      return (
                        <div key={comment.id}>
                          {/* Main comment */}
                          <div className="flex gap-2 group">
                            <button onClick={() => onFriendClick?.(comment.user.user_id)} className="shrink-0">
                              <Avatar className="w-6 h-6">
                                {comment.user.avatar_url && <AvatarImage src={comment.user.avatar_url} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                <AvatarFallback className="text-[9px] bg-white/10 text-white">{comment.user.username?.[0]}</AvatarFallback>
                              </Avatar>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <button onClick={() => onFriendClick?.(comment.user.user_id)} className="text-xs font-semibold text-white hover:underline truncate">{comment.user.display_name || comment.user.username}</button>
                                <span className="text-[10px] text-white/40 shrink-0" style={{ fontFamily: "'Space Mono', monospace" }}>{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                              </div>
                              <p className="text-xs text-white/70 mt-0.5 break-words">{comment.content}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <button
                                  onClick={() => handleLikeComment(comment.id, comment.has_liked)}
                                  className="flex items-center gap-1 text-[10px] text-white/40 hover:text-red-500 transition-colors"
                                >
                                  <Heart className={`w-3 h-3 ${comment.has_liked ? "fill-red-500 text-red-500" : ""}`} />
                                  {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo({ moodId: mood.id, commentId: comment.id, username: comment.user.display_name || comment.user.username || 'user' });
                                    haptic('light');
                                    // Focus the input after a short delay to ensure state is updated
                                    setTimeout(() => {
                                      commentInputRefs.current[mood.id]?.focus();
                                    }, 100);
                                  }}
                                  className="text-[10px] text-white/40 hover:text-[#C5A059] transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="ml-8 mt-2 space-y-2 border-l border-white/10 pl-3">
                              {replies.map((reply) => (
                                <div key={reply.id} className="flex gap-2 group">
                                  <button onClick={() => onFriendClick?.(reply.user.user_id)} className="shrink-0">
                                    <Avatar className="w-5 h-5">
                                      {reply.user.avatar_url && <AvatarImage src={reply.user.avatar_url} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                      <AvatarFallback className="text-[8px] bg-white/10 text-white">{reply.user.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <button onClick={() => onFriendClick?.(reply.user.user_id)} className="text-[11px] font-semibold text-white hover:underline truncate">{reply.user.display_name || reply.user.username}</button>
                                      <span className="text-[9px] text-white/40 shrink-0" style={{ fontFamily: "'Space Mono', monospace" }}>{formatDistanceToNow(new Date(reply.created_at))} ago</span>
                                    </div>
                                    <p className="text-[11px] text-white/70 mt-0.5 break-words">{reply.content}</p>
                                    <button
                                      onClick={() => handleLikeComment(reply.id, reply.has_liked)}
                                      className="flex items-center gap-1 mt-1 text-[10px] text-white/40 hover:text-red-500 transition-colors"
                                    >
                                      <Heart className={`w-2.5 h-2.5 ${reply.has_liked ? "fill-red-500 text-red-500" : ""}`} />
                                      {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}

                {/* Comment input */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  {replyingTo?.moodId === mood.id && (
                    <div className="flex items-center justify-between mb-2 px-2 py-1 bg-white/5 rounded">
                      <span className="text-[10px] text-white/60">
                        Replying to <span className="text-[#C5A059]">@{replyingTo.username}</span>
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-white/40 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      ref={(el) => { commentInputRefs.current[mood.id] = el; }}
                      placeholder={replyingTo?.moodId === mood.id ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                      className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      value={commentText[mood.id] || ""}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [mood.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(mood.id); }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-[#C5A059] hover:bg-[#C5A059]/80"
                      onClick={() => handlePostComment(mood.id)}
                      disabled={!commentText[mood.id]?.trim()}
                    >
                      <Send className="w-3 h-3 text-black" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render a fit check card using ZineFeedPost
  const renderFitCheckCard = (fitCheck: FitCheck) => (
    <ZineFeedPost
      key={fitCheck.id}
      id={fitCheck.id}
      username={fitCheck.user.username || "user"}
      displayName={fitCheck.user.display_name}
      avatarUrl={fitCheck.user.avatar_url}
      photoUrl={fitCheck.photo_url}
      caption={fitCheck.caption}
      likesCount={0}
      commentsCount={0}
      hasLiked={false}
      createdAt={fitCheck.created_at}
      streak={fitCheck.user.current_streak || 0}
      type="fitcheck"
      onLike={() => {}}
      onComment={() => {}}
      onPhotoClick={() => {}}
      onUserClick={() => onFriendClick?.(fitCheck.user.user_id)}
    />
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[50vh]">
      <div className="space-y-8 pb-20">
        {feedItems.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="relative mx-auto w-32 h-32 bg-[#1a1a1a] border border-white/10 p-2 mb-6"
              style={{ transform: "rotate(-2deg)" }}
            >
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white/20" />
              </div>
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-4 bg-[#C5A059]/70"
                style={{ transform: "rotate(2deg)" }}
              />
            </div>
            <p
              className="text-white/60 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              No updates yet
            </p>
            <p
              className="text-white/30 text-xs mt-2 italic"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your friends are being quiet...
            </p>
          </div>
        ) : (
          feedItems.map((item) =>
            item.type === 'fitcheck'
              ? renderFitCheckCard(item as FitCheck)
              : renderMoodCard(item as Mood)
          )
        )}
      </div>
    </PullToRefresh>
  );
};

const getMoodColor = (rating: number) => {
  if (rating >= 8) return "#22c55e"; 
  if (rating >= 5) return "#eab308"; 
  return "#ef4444"; 
};

export default FriendsFeed;