import { useEffect, useState, useCallback, useRef } from "react";
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
  isPixelTheme?: boolean;
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

const FriendsFeed = ({ isPixelTheme, onFriendClick, highlightMoodId, shouldOpenComments, closeFriendsOnly }: FriendsFeedProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);

  const { trigger: haptic } = useHaptic();

  const fetchFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

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
        setMoods([]);
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
            id, content, created_at, user_id,
            user:profiles(user_id, username, display_name, avatar_url, current_streak)
          `)
          .eq('mood_id', m.id)
          .order('created_at', { ascending: true });

        const commentsWithLikes = await Promise.all((comments || []).map(async (c: any) => {
          const { count: commentLikesCount } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', c.id);
          const { data: myCommentLike } = await supabase.from('comment_likes').select('id').eq('comment_id', c.id).eq('user_id', user.id).maybeSingle();

          return { ...c, likes_count: commentLikesCount || 0, has_liked: !!myCommentLike };
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
    if (!text?.trim() || !currentUser) return;
    haptic('success');

    try {
      const { error } = await supabase.from('mood_comments').insert({ mood_id: moodId, user_id: currentUser, content: text.trim() });
      if (error) throw error;
      setCommentText(prev => ({ ...prev, [moodId]: "" }));
      toast.success("Comment posted!");
      fetchFeed(); 
    } catch (err) { toast.error("Failed to post comment"); }
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
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 p-4 rounded-xl space-y-3">
             <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
             <Skeleton className="h-40 w-full rounded-lg" />
             <div className="flex gap-2"><Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-8" /></div>
          </div>
        ))}
      </div>
    );
  }

  // Render a mood card
  const renderMoodCard = (mood: Mood) => (
    <div key={mood.id} className={`bg-card border border-border p-4 shadow-sm ${isPixelTheme ? '' : 'rounded-xl'}`}>
      <div className="flex items-start justify-between mb-3">
        <button className="flex items-center gap-3 cursor-pointer text-left" onClick={() => onFriendClick?.(mood.user.user_id)}>
          <Avatar className={isPixelTheme ? "rounded-none" : ""}>
            {mood.user.avatar_url && <AvatarImage src={mood.user.avatar_url} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <AvatarFallback>{mood.user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-sm ${isPixelTheme ? "font-mono" : ""}`}>{mood.user.display_name || mood.user.username}</h3>
              {mood.user.current_streak && mood.user.current_streak > 0 ? (
                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 gap-1 px-1.5 h-5 pointer-events-none">
                  <Flame className="w-3 h-3 fill-orange-500" />{mood.user.current_streak}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">@{mood.user.username} • {formatDistanceToNow(new Date(mood.created_at), { addSuffix: true })}</p>
          </div>
        </button>
        <div className={`w-8 h-8 flex items-center justify-center font-bold text-white ${isPixelTheme ? "rounded-none" : "rounded-full"}`} style={{ backgroundColor: getMoodColor(mood.rating) }}>{mood.rating}</div>
      </div>

      <div className="pl-12">
        {mood.note && <p className={`text-foreground mb-3 ${isPixelTheme ? "font-mono text-xs" : "text-sm"}`}>"{mood.note}"</p>}
        {mood.photo_url && <div className="mb-3 rounded-lg overflow-hidden border border-border"><img src={mood.photo_url} alt="Mood" className="w-full object-cover max-h-64" loading="lazy" onError={(e) => { e.currentTarget.parentElement?.remove(); }} /></div>}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border relative">
          <div className="relative">
            <LikeButton mood={mood} />
            <AnimatePresence>
              {showReactionMenu === mood.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowReactionMenu(null)} />
                  <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: -45 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} className="absolute left-0 bottom-full z-20 flex items-center gap-1 bg-card shadow-xl border border-border rounded-full p-1.5">
                    {REACTIONS.map((r) => (
                      <button key={r.type} onClick={(e) => { e.stopPropagation(); handleReaction(mood.id, r.type); }} className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 transition-transform active:scale-95">{r.emoji}</button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => { haptic('light'); setOpenComments(prev => ({ ...prev, [mood.id]: !prev[mood.id] })); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg active:bg-secondary">
            <MessageCircle className="w-4 h-4" />{mood.comments.length > 0 ? `${mood.comments.length}` : 'Comment'}
          </button>
        </div>

        {(openComments[mood.id] || shouldOpenComments && highlightMoodId === mood.id) && (
          <div className="mt-3 space-y-3 bg-secondary/50 p-3 rounded-lg animate-in slide-in-from-top-2">
            {mood.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 group">
                <button onClick={() => onFriendClick?.(comment.user.user_id)} className="shrink-0"><Avatar className="w-6 h-6 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">{comment.user.avatar_url && <AvatarImage src={comment.user.avatar_url} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}<AvatarFallback className="text-[9px]">{comment.user.username?.[0]}</AvatarFallback></Avatar></button>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between"><button onClick={() => onFriendClick?.(comment.user.user_id)} className="text-xs font-semibold mr-2 hover:underline cursor-pointer">{comment.user.display_name || comment.user.username}</button><span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at))} ago</span></div>
                  <p className="text-xs text-foreground mt-0.5">{comment.content}</p>
                </div>
                <div className="flex flex-col items-center"><button onClick={() => handleLikeComment(comment.id, comment.has_liked)} className="p-1 hover:bg-secondary rounded-full transition-colors active:scale-90"><Heart className={`w-3 h-3 ${comment.has_liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} /></button>{comment.likes_count > 0 && (<span className="text-[9px] text-muted-foreground">{comment.likes_count}</span>)}</div>
              </div>
            ))}
            <div className="flex gap-2 mt-2"><Input placeholder="Reply..." className="h-8 text-xs bg-card" value={commentText[mood.id] || ""} onChange={(e) => setCommentText(prev => ({ ...prev, [mood.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(mood.id); }} /><Button size="icon" className="h-8 w-8" onClick={() => handlePostComment(mood.id)}><Send className="w-3 h-3" /></Button></div>
          </div>
        )}
      </div>
    </div>
  );

  // Render a fit check card with purple styling
  const renderFitCheckCard = (fitCheck: FitCheck) => (
    <div
      key={fitCheck.id}
      className={`bg-purple-500/10 border-2 border-purple-500 p-4 shadow-sm ${isPixelTheme ? '' : 'rounded-xl'}`}
    >
      {/* Fit Check badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1.5 px-2 py-1 bg-purple-500 text-white ${isPixelTheme ? '' : 'rounded-full'}`}>
          <Shirt className="w-3 h-3" />
          <span className={`font-semibold ${isPixelTheme ? 'text-[8px]' : 'text-[10px]'}`}>FIT CHECK</span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-3">
        <button className="flex items-center gap-3 cursor-pointer text-left" onClick={() => onFriendClick?.(fitCheck.user.user_id)}>
          <Avatar className={`ring-2 ring-purple-500 ${isPixelTheme ? "rounded-none" : ""}`}>
            {fitCheck.user.avatar_url && <AvatarImage src={fitCheck.user.avatar_url} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <AvatarFallback>{fitCheck.user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className={`font-bold text-sm text-purple-600 ${isPixelTheme ? "font-mono" : ""}`}>
              {fitCheck.user.display_name || fitCheck.user.username}
            </h3>
            <p className="text-xs text-purple-500/70">
              @{fitCheck.user.username} • {formatDistanceToNow(new Date(fitCheck.created_at), { addSuffix: true })}
            </p>
          </div>
        </button>
      </div>

      {/* Photo */}
      {fitCheck.photo_url && (
        <div className={`overflow-hidden border-2 border-purple-500/30 ${isPixelTheme ? '' : 'rounded-lg'}`}>
          <img
            src={fitCheck.photo_url}
            alt="Fit Check"
            className="w-full object-cover max-h-80"
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement?.remove(); }}
          />
        </div>
      )}

      {/* Caption */}
      {fitCheck.caption && (
        <p className={`text-purple-700 mt-3 ${isPixelTheme ? "font-mono text-xs" : "text-sm"}`}>
          {fitCheck.caption}
        </p>
      )}
    </div>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[50vh]">
      <div className="space-y-6 pb-20">
        {feedItems.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No mood updates yet.</p>
            <p className="text-sm">Your friends are being quiet!</p>
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