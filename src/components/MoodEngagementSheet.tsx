import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, X, User, Reply, CornerDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { formatDistanceToNow } from "date-fns";

interface MoodEngagementSheetProps {
  isOpen: boolean;
  onClose: () => void;
  moodId: string;
  moodOwnerId: string;
  photoUrl?: string | null;
  caption?: string | null;
  rating?: number;
  highlightCommentId?: string | null;
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
  likes_count: number;
  user_liked: boolean;
}

interface LikeUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  reaction_type: string | null;
}

const REACTIONS_MAP: Record<string, string> = {
  'heart': '❤️',
  'fire': '🔥',
  'hug': '🫂',
  'flex': '💪',
  'star': '🌟',
};

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

// Memoized comment component
const CommentItem = memo(({
  comment,
  isReply,
  userId,
  onReply,
  onDelete,
  onLike,
  isHighlighted
}: {
  comment: Comment;
  isReply: boolean;
  userId?: string;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string, liked: boolean) => void;
  isHighlighted: boolean;
}) => (
  <div
    id={`comment-${comment.id}`}
    className={`flex gap-2 transition-all duration-500 ${isReply ? "ml-6 pl-2 border-l-2 border-border" : ""} ${
      isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg p-2 bg-primary/5" : ""
    }`}
  >
    <div className="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden rounded-full">
      {comment.user_profile?.avatar_url ? (
        <img
          src={comment.user_profile.avatar_url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <User className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm">
          {comment.user_profile?.display_name || "User"}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </span>
        {!isReply && (
          <button
            onClick={() => onReply(comment.id, comment.user_profile?.display_name || "User")}
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 text-xs"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
        )}
        {comment.user_id === userId && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-muted-foreground hover:text-destructive ml-auto"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="break-words mt-1 text-sm">
        {comment.content}
      </p>
      <button
        onClick={() => onLike(comment.id, comment.user_liked)}
        className="flex items-center gap-1 mt-1 text-muted-foreground hover:text-red-500 transition-colors text-xs"
      >
        <Heart className={`w-3 h-3 ${comment.user_liked ? "fill-red-500 text-red-500" : ""}`} />
        {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
      </button>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply={true}
              userId={userId}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              isHighlighted={false}
            />
          ))}
        </div>
      )}
    </div>
  </div>
));

CommentItem.displayName = "CommentItem";

const MoodEngagementSheet = ({
  isOpen,
  onClose,
  moodId,
  moodOwnerId,
  photoUrl,
  caption,
  rating = 5,
  highlightCommentId
}: MoodEngagementSheetProps) => {
  const [activeTab, setActiveTab] = useState<"likes" | "comments">("comments");
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && moodId) {
      fetchComments();
      fetchLikes();
    }
  }, [isOpen, moodId]);

  useEffect(() => {
    if (highlightCommentId && comments.length > 0 && !loading) {
      setHighlightedId(highlightCommentId);
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => setHighlightedId(null), 3000);
      }, 100);
    }
  }, [highlightCommentId, comments.length, loading]);

  const fetchComments = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [commentsRes, likesRes] = await Promise.all([
      supabase
        .from('mood_comments')
        .select('*')
        .eq('mood_id', moodId)
        .order('created_at', { ascending: true }),
      supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .eq('user_id', user.id)
    ]);

    const data = commentsRes.data;
    const userLikes = new Set((likesRes.data || []).map(l => l.comment_id));

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const commentIds = data.map(c => c.id);

      const [profilesRes, countsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds),
        supabase
          .from('comment_likes')
          .select('comment_id')
          .in('comment_id', commentIds)
      ]);

      const profileMap = new Map(
        (profilesRes.data || []).map(p => [p.user_id, p])
      );

      const likeCounts = new Map<string, number>();
      (countsRes.data || []).forEach(l => {
        likeCounts.set(l.comment_id, (likeCounts.get(l.comment_id) || 0) + 1);
      });

      const allComments: Comment[] = data.map(comment => ({
        ...comment,
        user_profile: profileMap.get(comment.user_id) || null,
        replies: [] as Comment[],
        likes_count: likeCounts.get(comment.id) || 0,
        user_liked: userLikes.has(comment.id)
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

      setComments(topLevel);
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [moodId, user]);

  const fetchLikes = useCallback(async () => {
    const { data: likesData } = await supabase
      .from('mood_likes')
      .select('*')
      .eq('mood_id', moodId);

    if (likesData && likesData.length > 0) {
      const likes = likesData as any[];
      const userIds = likes.map(l => l.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const mergedLikes = (profiles || []).map(profile => {
        const likeInfo = likes.find(l => l.user_id === profile.user_id);
        return {
          ...profile,
          reaction_type: likeInfo?.reaction_type || 'heart'
        };
      });

      setLikes(mergedLikes);
    } else {
      setLikes([]);
    }
  }, [moodId]);

  const handleCommentLike = useCallback(async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    setComments(prev => {
      const updateComment = (c: Comment): Comment => ({
        ...c,
        likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1,
        user_liked: !isLiked,
        replies: c.replies?.map(updateComment)
      });
      return prev.map(c => c.id === commentId ? updateComment(c) : {
        ...c,
        replies: c.replies?.map(r => r.id === commentId ? updateComment(r) : r)
      });
    });

    if (isLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
    }
  }, [user]);

  const handleSubmitComment = useCallback(async () => {
    if (!user || !newComment.trim()) return;

    const content = newComment.trim();
    if (content.length > 500) {
      toast({
        title: "Comment too long",
        description: "Keep it under 500 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmittingComment(true);

    const insertData: { mood_id: string; user_id: string; content: string; parent_id?: string } = {
      mood_id: moodId,
      user_id: user.id,
      content
    };

    if (replyingTo) {
      insertData.parent_id = replyingTo.commentId;
    }

    const { error } = await supabase
      .from('mood_comments')
      .insert(insertData);

    setSubmittingComment(false);

    if (error) {
      toast({ title: "Couldn't post comment", variant: "destructive" });
      return;
    }

    if (replyingTo && user.id !== moodOwnerId) {
      const parentComment = comments.find(c => c.id === replyingTo.commentId);
      if (parentComment && parentComment.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: parentComment.user_id,
          actor_id: user.id,
          type: 'comment',
          mood_id: moodId
        });
      }
    }

    setNewComment("");
    setReplyingTo(null);
    await fetchComments();
  }, [user, newComment, moodId, replyingTo, moodOwnerId, comments, toast, fetchComments]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await supabase
      .from('mood_comments')
      .delete()
      .eq('id', commentId);
    await fetchComments();
  }, [fetchComments]);

  const handleReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setNewComment("");
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border-t border-border w-full max-w-lg flex flex-col h-[90dvh] rounded-t-3xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-lg">
                Mood Details
              </h3>
              <button
                onClick={onClose}
                className="p-2 bg-secondary touch-manipulation hover:bg-muted transition-colors rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 bg-background/50 overscroll-contain">

              {photoUrl && (
                <div className="w-full bg-secondary/20">
                  <img
                    src={photoUrl}
                    alt="Mood"
                    loading="lazy"
                    className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                  />
                </div>
              )}

              <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-3 py-1 text-white font-medium text-xs rounded-full"
                    style={{ backgroundColor: getMoodColor(rating) }}
                  >
                    {rating}/10
                  </span>
                </div>
                {caption && (
                  <p className="text-foreground/90 text-sm">
                    {caption}
                  </p>
                )}
              </div>

              <div className="sticky top-0 z-10 bg-card border-y border-border flex shadow-sm">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "comments"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Comments ({comments.length})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("likes")}
                  className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "likes"
                      ? "text-red-500 border-b-2 border-red-500 bg-red-500/5"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${activeTab === "likes" ? "fill-current" : ""}`} />
                  <span className="text-sm">
                    Reactions ({likes.length})
                  </span>
                </button>
              </div>

              <div className="p-4 pb-32">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : activeTab === "comments" ? (
                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 text-sm">
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          isReply={false}
                          userId={user?.id}
                          onReply={handleReply}
                          onDelete={handleDeleteComment}
                          onLike={handleCommentLike}
                          isHighlighted={highlightedId === comment.id}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {likes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 text-sm">
                        No reactions yet.
                      </p>
                    ) : (
                      likes.map((likeUser) => (
                        <div key={likeUser.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border/50">
                          <div className="w-10 h-10 bg-secondary flex items-center justify-center overflow-hidden rounded-full">
                            {likeUser.avatar_url ? (
                              <img
                                src={likeUser.avatar_url}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">
                            {likeUser.display_name || "Friend"}
                          </span>

                          <span className="ml-auto text-xl">
                            {REACTIONS_MAP[likeUser.reaction_type || 'heart'] || '❤️'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeTab === "comments" && (
              <div className="flex-shrink-0 border-t border-border bg-card p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {replyingTo && (
                  <div className="px-1 py-2 mb-2 flex items-center justify-between text-muted-foreground bg-secondary/30 rounded-lg">
                    <span className="flex items-center gap-1 ml-2 text-xs">
                      <CornerDownRight className="w-3 h-3" />
                      Replying to {replyingTo.userName}
                    </span>
                    <button
                      onClick={cancelReply}
                      className="mr-2 hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <Input
                    placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={500}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="p-2 bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0 rounded-full"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoodEngagementSheet;
