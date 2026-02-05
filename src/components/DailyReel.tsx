import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useHaptic } from "@/hooks/useHaptic";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import FeedPost, { MoodMention } from "./FeedPost";

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
  song_title?: string | null;
  song_artist?: string | null;
  song_preview_url?: string | null;
  mentions?: MoodMention[];
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
  communityBadgeIds?: string[];
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
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { trigger: haptic } = useHaptic();

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
        // @ts-ignore
        const { data: badgeUsers } = await supabase
          .from('user_badges')
          .select('user_id')
          .in('badge_id', communityBadgeIds)
          .eq('is_equipped', true);

        friendIds = badgeUsers?.map(b => b.user_id) || [];
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
          id, rating, note:caption, photo_url, created_at, user_id, song_title, song_artist, song_preview_url,
          user:profiles!moods_user_id_fkey(user_id, username, display_name, avatar_url, current_streak)
        `)
        .in('user_id', friendIds)
        .gte('created_at', yesterdayISO);

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

      // Fetch mentions for all moods
      // @ts-ignore - mood_mentions table exists but not in generated types
      const { data: allMentions } = await supabase
        .from('mood_mentions')
        .select(`
          mood_id,
          mentioned_user_id,
          user:profiles!mood_mentions_mentioned_user_id_fkey(user_id, username, display_name)
        `)
        .in('mood_id', moodIds);

      const mentionsByMood = new Map<string, MoodMention[]>();
      (allMentions || []).forEach((m: any) => {
        const moodMentions = mentionsByMood.get(m.mood_id) || [];
        if (m.user) {
          moodMentions.push({
            user_id: m.mentioned_user_id,
            username: m.user.username,
            display_name: m.user.display_name,
          });
        }
        mentionsByMood.set(m.mood_id, moodMentions);
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
          song_title: m.song_title || null,
          song_artist: m.song_artist || null,
          song_preview_url: m.song_preview_url || null,
          mentions: mentionsByMood.get(m.id) || [],
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

      // Merge and sort by created_at (most recent first)
      const allItems: FeedItem[] = [...moodsWithDetails, ...fitChecksWithDetails]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFeedItems(allItems);

    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Could not load feed.");
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

  // Render a single feed post
  const renderFeedPost = (item: FeedItem) => {
    const isMood = item.type === 'mood';
    const mood = isMood ? item as Mood : null;
    const fitCheck = !isMood ? item as FitCheck : null;
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
      <div key={item.id} className="relative">
        <FeedPost
          id={item.id}
          username={item.user.username || "user"}
          displayName={item.user.display_name}
          avatarUrl={item.user.avatar_url}
          photoUrl={item.photo_url}
          caption={mood?.note || fitCheck?.caption}
          rating={mood?.rating}
          likesCount={mood?.likes_count || 0}
          commentsCount={mood?.comments_count || 0}
          hasLiked={mood?.has_liked || false}
          createdAt={item.created_at}
          streak={item.user.current_streak || 0}
          type={item.type}
          isOwnPost={isOwnPost}
          equippedBadges={item.user.equipped_badges}
          songTitle={mood?.song_title}
          songArtist={mood?.song_artist}
          songPreviewUrl={mood?.song_preview_url}
          mentions={mood?.mentions}
          onLike={handleLike}
          onComment={handleComment}
          onUserClick={() => onFriendClick?.(item.user.user_id)}
          onMentionClick={(userId) => onFriendClick?.(userId)}
        />

        {/* Reaction menu overlay */}
        <AnimatePresence>
          {mood && showReactionMenu === mood.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowReactionMenu(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-16 z-50 flex items-center gap-1 bg-card border border-border rounded-full p-2 shadow-xl"
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
              className="mt-2 bg-card border border-border rounded-xl p-3 overflow-hidden"
            >
              <div className="space-y-2">
                {mood.comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-3">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-3">
                    {mood.comments
                      .filter(c => !c.parent_id)
                      .map((comment) => {
                        const replies = mood.comments.filter(c => c.parent_id === comment.id);
                        return (
                          <div key={comment.id}>
                            <div className="flex gap-2">
                              <Avatar className="w-7 h-7 shrink-0">
                                {comment.user.avatar_url && <AvatarImage src={comment.user.avatar_url} />}
                                <AvatarFallback className="text-xs bg-secondary">{comment.user.username?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {comment.user.display_name || comment.user.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDistanceToNow(new Date(comment.created_at))} ago
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/80 mt-0.5">{comment.content}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <button
                                    onClick={() => handleLikeComment(comment.id, comment.has_liked)}
                                    className={`flex items-center gap-1 text-xs ${comment.has_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"} transition-colors`}
                                  >
                                    <Heart className={`w-3 h-3 ${comment.has_liked ? "fill-current" : ""}`} />
                                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo({ moodId: mood.id, commentId: comment.id, username: comment.user.display_name || comment.user.username || 'user' });
                                      haptic('light');
                                      setTimeout(() => { commentInputRefs.current[mood.id]?.focus(); }, 100);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="ml-9 mt-2 space-y-2 border-l-2 border-border pl-3">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <Avatar className="w-6 h-6 shrink-0">
                                      {reply.user.avatar_url && <AvatarImage src={reply.user.avatar_url} />}
                                      <AvatarFallback className="text-[10px] bg-secondary">{reply.user.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-foreground">
                                        {reply.user.display_name || reply.user.username}
                                      </span>
                                      <p className="text-xs text-foreground/80">{reply.content}</p>
                                      <button
                                        onClick={() => handleLikeComment(reply.id, reply.has_liked)}
                                        className={`flex items-center gap-1 mt-1 text-[10px] ${reply.has_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"} transition-colors`}
                                      >
                                        <Heart className={`w-2.5 h-2.5 ${reply.has_liked ? "fill-current" : ""}`} />
                                        {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Comment input */}
                <div className="mt-3 pt-3 border-t border-border">
                  {replyingTo?.moodId === mood.id && (
                    <div className="flex items-center justify-between mb-2 px-2 py-1 bg-secondary rounded">
                      <span className="text-xs text-muted-foreground">
                        Replying to <span className="text-primary font-medium">@{replyingTo.username}</span>
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      ref={(el) => { commentInputRefs.current[mood.id] = el; }}
                      placeholder={replyingTo?.moodId === mood.id ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                      className="h-9 text-sm bg-secondary border-border"
                      value={commentText[mood.id] || ""}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [mood.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(mood.id); }}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 bg-primary hover:bg-primary/90 shrink-0"
                      onClick={() => handlePostComment(mood.id)}
                      disabled={!commentText[mood.id]?.trim()}
                    >
                      <Send className="w-4 h-4" />
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

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
        <p className="text-muted-foreground text-sm">
          When your friends post, you'll see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6 pb-28">
      {feedItems.map((item) => renderFeedPost(item))}
    </div>
  );
};

export default DailyReel;
