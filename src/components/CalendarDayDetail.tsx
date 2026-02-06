import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Send, Reply, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CalendarDayDetailProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onFriendClick?: (friendId: string) => void;
}

interface MoodEntry {
  id: string;
  rating: number;
  caption: string | null;
  photo_url: string | null;
  photo_signed_url?: string | null;
  created_at: string;
  user_id: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    show_rating_to_friends?: boolean;
    show_photo_to_friends?: boolean;
    show_caption_to_friends?: boolean;
  } | null;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const getMoodLabel = (rating: number): string => {
  if (rating <= 2) return "Stormy";
  if (rating <= 4) return "Rainy";
  if (rating <= 6) return "Cloudy";
  if (rating <= 8) return "Partly sunny";
  return "Bright & sunny";
};

const CalendarDayDetail = ({ isOpen, onClose, date, onFriendClick }: CalendarDayDetailProps) => {
  const [activeTab, setActiveTab] = useState<"you" | "friends">("you");
  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [friendMoods, setFriendMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string; moodId: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const { user } = useAuth();

  // Check if viewing an old mood (not today) - make commenting read-only for old moods
  const isOldMood = (() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return date !== todayStr;
  })();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && date && user) {
      fetchMoods();
    }
  }, [isOpen, date, user]);

  const fetchComments = async (moodId: string) => {
    const { data } = await supabase
      .from('mood_comments')
      .select('*')
      .eq('mood_id', moodId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const allComments = data.map(comment => ({
        ...comment,
        user_profile: profileMap.get(comment.user_id) || null,
        replies: [] as Comment[]
      }));

      const topLevel: Comment[] = [];
      const repliesMap = new Map<string, Comment[]>();

      allComments.forEach(comment => {
        if (comment.parent_id) {
          const existing = repliesMap.get(comment.parent_id) || [];
          existing.push(comment);
          repliesMap.set(comment.parent_id, existing);
        } else {
          topLevel.push(comment);
        }
      });

      topLevel.forEach(comment => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      setComments(prev => ({ ...prev, [moodId]: topLevel }));
    } else {
      setComments(prev => ({ ...prev, [moodId]: [] }));
    }
  };

  const fetchMoods = async () => {
    if (!user) return;
    setLoading(true);

    const { data: myMoodData } = await supabase
      .from('moods')
      .select('*')
      .eq('date', date)
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch friend moods in parallel with processing own mood
    const friendMoodsPromise = supabase
      .from('moods')
      .select('*')
      .eq('date', date)
      .neq('user_id', user.id)
      .in('visibility', ['friends', 'close_friends']);

    if (myMoodData) {
      const [likesResult, commentsResult, userLikeResult] = await Promise.all([
        supabase.from('mood_likes').select('*', { count: 'exact', head: true }).eq('mood_id', myMoodData.id),
        supabase.from('mood_comments').select('*', { count: 'exact', head: true }).eq('mood_id', myMoodData.id),
        supabase.from('mood_likes').select('*').eq('mood_id', myMoodData.id).eq('user_id', user.id).maybeSingle()
      ]);

      // Signed URL for own mood will be batched below
      const myMoodObj = {
        ...myMoodData,
        photo_signed_url: null as string | null,
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
        user_liked: !!userLikeResult.data
      };

      setMyMood(myMoodObj);
      setExpandedComments(myMoodObj.id);
      fetchComments(myMoodObj.id);
    } else {
      setMyMood(null);
    }

    const { data: friendMoodsData } = await friendMoodsPromise;

    // Collect all photo paths for batch signing
    const allPhotoPaths: string[] = [];
    if (myMoodData?.photo_url) allPhotoPaths.push(myMoodData.photo_url);

    let profilesMap = new Map<string, any>();
    let likesCountMap = new Map<string, number>();
    let userLikedSet = new Set<string>();
    let commentsCountMap = new Map<string, number>();

    if (friendMoodsData && friendMoodsData.length > 0) {
      const userIds = [...new Set(friendMoodsData.map(m => m.user_id).filter(Boolean))] as string[];
      const moodIds = friendMoodsData.map(m => m.id);

      const [profilesResult, likesResult, userLikesResult, commentsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, avatar_url, show_rating_to_friends, show_photo_to_friends, show_caption_to_friends').in('user_id', userIds),
        supabase.from('mood_likes').select('mood_id').in('mood_id', moodIds),
        supabase.from('mood_likes').select('mood_id').in('mood_id', moodIds).eq('user_id', user.id),
        supabase.from('mood_comments').select('mood_id').in('mood_id', moodIds)
      ]);

      profilesMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));
      (likesResult.data || []).forEach(like => {
        likesCountMap.set(like.mood_id, (likesCountMap.get(like.mood_id) || 0) + 1);
      });
      userLikedSet = new Set((userLikesResult.data || []).map(l => l.mood_id));
      (commentsResult.data || []).forEach(c => {
        commentsCountMap.set(c.mood_id, (commentsCountMap.get(c.mood_id) || 0) + 1);
      });

      // Collect friend mood photos that should be signed
      friendMoodsData.forEach(mood => {
        const profile = profilesMap.get(mood.user_id || '');
        if (mood.photo_url && profile?.show_photo_to_friends) {
          allPhotoPaths.push(mood.photo_url);
        }
      });
    }

    // Batch sign all URLs in one request
    const signedUrlMap = new Map<string, string>();
    if (allPhotoPaths.length > 0) {
      const { data: signedUrls } = await supabase.storage
        .from('mood-photos')
        .createSignedUrls(allPhotoPaths, 3600);
      if (signedUrls) {
        signedUrls.forEach((item) => {
          if (!item.error && item.signedUrl && item.path) {
            signedUrlMap.set(item.path, item.signedUrl);
          }
        });
      }
    }

    // Update own mood's signed URL
    if (myMoodData?.photo_url) {
      setMyMood(prev => prev ? {
        ...prev,
        photo_signed_url: signedUrlMap.get(myMoodData.photo_url!) || null
      } : null);
    }

    // Map friend moods synchronously
    if (friendMoodsData && friendMoodsData.length > 0) {
      const enrichedMoods = friendMoodsData.map((mood) => {
        const profile = profilesMap.get(mood.user_id || '');
        const signedUrl = (mood.photo_url && profile?.show_photo_to_friends)
          ? signedUrlMap.get(mood.photo_url) || null
          : null;
        return {
          ...mood,
          user_profile: profile || null,
          photo_signed_url: signedUrl,
          likes_count: likesCountMap.get(mood.id) || 0,
          comments_count: commentsCountMap.get(mood.id) || 0,
          user_liked: userLikedSet.has(mood.id)
        };
      });

      setFriendMoods(enrichedMoods);
    } else {
      setFriendMoods([]);
    }

    setLoading(false);
  };

  const toggleComments = async (moodId: string) => {
    if (expandedComments === moodId) {
      setExpandedComments(null);
      setReplyingTo(null);
    } else {
      setExpandedComments(moodId);
      if (!comments[moodId]) {
        await fetchComments(moodId);
      }
    }
  };

  const handleLike = async (moodId: string, isLiked: boolean, ownerId: string) => {
    if (!user) return;

    if (isLiked) {
      await supabase.from('mood_likes').delete().eq('mood_id', moodId).eq('user_id', user.id);
    } else {
      await supabase.from('mood_likes').insert({ mood_id: moodId, user_id: user.id });
      if (ownerId !== user.id) {
        const { data: newNotif } = await supabase.from('notifications')
          .insert({
            user_id: ownerId,
            actor_id: user.id,
            type: 'like',
            mood_id: moodId
          })
          .select()
          .single();

        if (newNotif) {
          await supabase.functions.invoke('send-push-notifications', {
            body: { id: newNotif.id }
          });
        }
      }
    }

    if (myMood?.id === moodId) {
      setMyMood(prev => prev ? {
        ...prev,
        user_liked: !isLiked,
        likes_count: isLiked ? prev.likes_count - 1 : prev.likes_count + 1
      } : null);
    } else {
      setFriendMoods(prev => prev.map(m =>
        m.id === moodId
          ? { ...m, user_liked: !isLiked, likes_count: isLiked ? m.likes_count - 1 : m.likes_count + 1 }
          : m
      ));
    }
  };

  const handleSubmitComment = async (moodId: string, ownerId: string) => {
    if (!user || !newComment.trim()) return;

    const content = newComment.trim();
    if (content.length > 500) {
      toast({ title: "Comment too long", description: "Keep it under 500 characters", variant: "destructive" });
      return;
    }

    setSubmittingComment(true);

    const insertData: { mood_id: string; user_id: string; content: string; parent_id?: string } = {
      mood_id: moodId,
      user_id: user.id,
      content
    };

    if (replyingTo && replyingTo.moodId === moodId) {
      insertData.parent_id = replyingTo.commentId;
    }

    const { error } = await supabase.from('mood_comments').insert(insertData);
    setSubmittingComment(false);

    if (error) {
      toast({ title: "Couldn't post comment", variant: "destructive" });
      return;
    }

    if (ownerId !== user.id) {
      const { data: newNotif } = await supabase.from('notifications')
        .insert({
          user_id: ownerId,
          actor_id: user.id,
          type: 'comment',
          mood_id: moodId
        })
        .select()
        .single();

      if (newNotif) {
        await supabase.functions.invoke('send-push-notifications', {
          body: { id: newNotif.id }
        });
      }
    }

    setNewComment("");
    setReplyingTo(null);
    await fetchComments(moodId);

    if (myMood?.id === moodId) {
      setMyMood(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null);
    } else {
      setFriendMoods(prev => prev.map(m =>
        m.id === moodId ? { ...m, comments_count: m.comments_count + 1 } : m
      ));
    }
  };

  const handleReply = (commentId: string, userName: string, moodId: string) => {
    setReplyingTo({ commentId, userName, moodId });
    setNewComment(`@${userName} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const renderComment = (comment: Comment, moodId: string, isReply: boolean = false) => (
    <div key={comment.id} className={`flex gap-2 ${isReply ? "ml-6 pl-2 border-l-2 border-border" : ""}`}>
      <button onClick={() => onFriendClick?.(comment.user_id)} className="shrink-0">
        <Avatar className="w-6 h-6 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={comment.user_profile?.avatar_url || undefined} />
          <AvatarFallback className="text-[9px]">{comment.user_profile?.display_name?.[0]}</AvatarFallback>
        </Avatar>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onFriendClick?.(comment.user_id)}
            className="font-medium hover:underline cursor-pointer text-xs"
          >
            {comment.user_profile?.display_name || "User"}
          </button>

          <span className="text-muted-foreground text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {!isReply && !isOldMood && (
            <button
              onClick={() => handleReply(comment.id, comment.user_profile?.display_name || "User", moodId)}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 text-[10px]"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
        <p className="break-words text-sm">{comment.content}</p>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map(reply => renderComment(reply, moodId, true))}
          </div>
        )}
      </div>
    </div>
  );

  const renderMoodCard = (mood: MoodEntry, isOwn: boolean) => {
    const showRating = isOwn || (mood.user_profile?.show_rating_to_friends ?? true);
    const showPhoto = isOwn || (mood.user_profile?.show_photo_to_friends ?? true);
    const showCaption = isOwn || (mood.user_profile?.show_caption_to_friends ?? true);
    const isExpanded = expandedComments === mood.id;
    const moodComments = comments[mood.id] || [];

    return (
      <motion.div
        key={mood.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border overflow-hidden rounded-2xl"
      >
        <div className="p-4 flex items-center gap-3">
          <button
            className="flex items-center gap-3 flex-1 text-left"
            onClick={() => !isOwn && onFriendClick?.(mood.user_id)}
            disabled={isOwn}
          >
            <Avatar>
              <AvatarImage src={mood.user_profile?.avatar_url || undefined} />
              <AvatarFallback>{mood.user_profile?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {isOwn ? "You" : (mood.user_profile?.display_name || "Friend")}
              </p>
              {showRating && (
                <p className="text-muted-foreground text-xs">
                  {getMoodLabel(mood.rating)}
                </p>
              )}
            </div>
          </button>

          {showRating && (
            <div
              className="px-3 py-1 font-bold text-white text-sm rounded-full"
              style={{ backgroundColor: getMoodColor(mood.rating) }}
            >
              {mood.rating}/10
            </div>
          )}
        </div>

        {showPhoto && mood.photo_signed_url && (
          <div className="w-full aspect-square bg-secondary/20 relative pointer-events-none">
            <img src={mood.photo_signed_url} alt="Mood" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        {showCaption && mood.caption && (
          <p className="px-4 py-3 text-sm">{mood.caption}</p>
        )}

        <div className="px-4 py-3 border-t border-border flex items-center gap-4">
          <button
            onClick={() => handleLike(mood.id, mood.user_liked, mood.user_id)}
            className={`flex items-center gap-1.5 transition-colors ${
              mood.user_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`w-5 h-5 ${mood.user_liked ? "fill-current" : ""}`} />
            <span className="text-sm">{mood.likes_count}</span>
          </button>
          <button
            onClick={() => toggleComments(mood.id)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{mood.comments_count}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <div className="border-t border-border overflow-hidden">
              <div className="p-4 space-y-3 max-h-60 overflow-y-auto overscroll-contain">
                {moodComments.length === 0 ? (
                  <p className="text-muted-foreground text-center text-sm">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  moodComments.map((comment) => renderComment(comment, mood.id))
                )}
              </div>

              {replyingTo && replyingTo.moodId === mood.id && (
                <div className="px-3 py-2 bg-secondary/50 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <CornerDownRight className="w-3 h-3" />
                    Replying to {replyingTo.userName}
                  </span>
                  <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!isOldMood && (
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder={replyingTo?.moodId === mood.id ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
                    value={expandedComments === mood.id ? newComment : ""}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={500}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment(mood.id, mood.user_id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSubmitComment(mood.id, mood.user_id)}
                    disabled={!newComment.trim() || submittingComment}
                    className="p-2 bg-primary text-primary-foreground disabled:opacity-50 rounded-full"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border w-full max-w-lg h-auto max-h-[80vh] flex flex-col shadow-2xl rounded-3xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-lg">
                {formattedDate}
              </h3>
              <button
                onClick={onClose}
                className="p-2 bg-secondary touch-manipulation rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-border flex-shrink-0">
              <button
                onClick={() => setActiveTab("you")}
                className={`flex-1 py-3 text-center transition-colors ${
                  activeTab === "you"
                    ? "text-primary border-b-2 border-primary font-medium"
                    : "text-muted-foreground"
                } text-sm`}
              >
                Your Mood
              </button>
              <button
                onClick={() => setActiveTab("friends")}
                className={`flex-1 py-3 text-center transition-colors ${
                  activeTab === "friends"
                    ? "text-primary border-b-2 border-primary font-medium"
                    : "text-muted-foreground"
                } text-sm`}
              >
                Friends ({friendMoods.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              ) : activeTab === "you" ? (
                myMood ? (
                  <div className="space-y-4">
                    {renderMoodCard(myMood, true)}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No mood logged for this day</p>
                  </div>
                )
              ) : (
                friendMoods.length > 0 ? (
                  <div className="space-y-4">
                    {friendMoods.map(mood => renderMoodCard(mood, false))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No friend moods for this day</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalendarDayDetail;
