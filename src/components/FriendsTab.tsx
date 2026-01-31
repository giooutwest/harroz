import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Star, Check, X, Mail, Newspaper, User, Bell, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DailyReel from "./DailyReel";
import FriendProfileModal from "./FriendProfileModal";
import NotificationsSheet from "./NotificationsSheet";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { formatDistanceToNow } from "date-fns";

interface FriendsTabProps {
  initialSelectedFriendId?: string | null;
  initialSelectedMoodId?: string | null;
  initialSelectedCommentId?: string | null;
  initialShowRequests?: boolean;
  initialOpenComments?: boolean;
  onClearInitialFriend?: () => void;
}

interface FriendProfile { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; }
interface Friendship { id: string; requester_id: string; addressee_id: string; status: string; friend_profile?: FriendProfile; }
interface CloseFriend { friend_id: string; friend_profile?: FriendProfile; }
interface FriendSuggestion { user_id: string; display_name: string | null; avatar_url: string | null; username: string | null; mutual_friend_name: string | null; }

interface Nudge {
  id: string;
  sender_id: string;
  created_at: string;
  sender_profile?: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
  };
}

const FriendsTab = ({ initialSelectedFriendId, initialSelectedMoodId, initialSelectedCommentId, initialShowRequests, initialOpenComments, onClearInitialFriend }: FriendsTabProps) => {
  const [activeSection, setActiveSection] = useState<"feed" | "friends" | "close" | "requests">("feed");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [closeFriends, setCloseFriends] = useState<CloseFriend[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]); 
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ user_id: string; username: string; display_name: string | null } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestion[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightMoodId, setHighlightMoodId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [shouldOpenComments, setShouldOpenComments] = useState(false);
  
  // 🔥 FIXED: Direct assignment since the hook returns a number, NOT an object.
  // @ts-ignore
  const unreadCount: number = useUnreadNotifications();
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // Parallelize all initial data fetches for faster load
      Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
        fetchCloseFriends(),
        fetchMyUsername(),
        fetchNudges()
      ]);
    }
  }, [user]);

  useEffect(() => {
    if (initialShowRequests) { setActiveSection("requests"); onClearInitialFriend?.(); }
    else if (initialSelectedMoodId) { setActiveSection("feed"); setHighlightMoodId(initialSelectedMoodId); setHighlightCommentId(initialSelectedCommentId || null); if (initialOpenComments) setShouldOpenComments(true); onClearInitialFriend?.(); }
    else if (initialSelectedFriendId) { setSelectedFriendId(initialSelectedFriendId); onClearInitialFriend?.(); }
  }, [initialSelectedFriendId, initialSelectedMoodId, initialSelectedCommentId, initialShowRequests, initialOpenComments, onClearInitialFriend]);

  const fetchMyUsername = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle();
    setMyUsername(data?.username || null);
  };

  const fetchFriends = async () => {
    if (!user) return;
    const { data } = await supabase.from('friendships').select('*').eq('status', 'accepted').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (data) {
      const friendIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', friendIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      // @ts-ignore
      setFriends(data.map(f => ({ ...f, friend_profile: profileMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id) })));
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from('friendships').select('*').eq('addressee_id', user.id).eq('status', 'pending');
    if (data) {
      const ids = data.map(r => r.requester_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      // @ts-ignore
      setPendingRequests(data.map(r => ({ ...r, friend_profile: profileMap.get(r.requester_id) })));
    }
  };

  const fetchCloseFriends = async () => {
    if (!user) return;
    const { data } = await supabase.from('close_friends').select('friend_id').eq('user_id', user.id);
    if (data) {
      const ids = data.map(cf => cf.friend_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      // @ts-ignore
      setCloseFriends(data.map(cf => ({ ...cf, friend_profile: profileMap.get(cf.friend_id) })));
    }
  };

  const fetchNudges = async () => {
    if (!user) return;
    // @ts-ignore - Supress TS error for new table
    const { data } = await supabase.from('nudges').select('id, sender_id, created_at').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data && data.length > 0) {
      // @ts-ignore
      const senderIds = data.map(n => n.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      // @ts-ignore
      const nudgesWithProfiles = data.map(n => ({ ...n, sender_profile: profileMap.get(n.sender_id) }));
      setNudges(nudgesWithProfiles);
    } else { setNudges([]); }
  };

  const fetchFriendSuggestions = async () => { if (!user) return; setLoadingSuggestions(false); };
  
  useEffect(() => { if (showAddFriend && user) fetchFriendSuggestions(); }, [showAddFriend, user]);

  const handleSearchUsername = async () => {
    if (!user || !searchUsername.trim()) return;
    setIsSearching(true); setSearchError(null); setSearchResult(null);
    const searchTerm = searchUsername.toLowerCase().replace('@', '');
    if (searchTerm === myUsername?.toLowerCase()) { setSearchError("You can't add yourself!"); setIsSearching(false); return; }
    const { data, error } = await supabase.from('profiles').select('user_id, username, display_name').ilike('username', searchTerm).maybeSingle();
    if (error || !data) setSearchError("User not found.");
    else {
      const { data: existing } = await supabase.from('friendships').select('status').or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},addressee_id.eq.${user.id})`).maybeSingle();
      if (existing) setSearchError(existing.status === 'accepted' ? "Already friends!" : "Request pending!");
      else setSearchResult(data);
    }
    setIsSearching(false);
  };

  const handleSendRequest = async () => {
    if (!user || !searchResult || isSearching) return;
    setIsSearching(true);

    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: searchResult.user_id, status: 'pending' });
    if (!error) {
      await supabase.from('notifications').insert({ user_id: searchResult.user_id, actor_id: user.id, type: 'friend_request', mood_id: null });
      // Database trigger will automatically queue push notification
      toast({ title: "Request sent!" });
      setShowAddFriend(false);
      setSearchResult(null);
      setSearchUsername("");
    } else {
      toast({ title: "Failed to send request", variant: "destructive" });
    }

    setIsSearching(false);
  };

  const handleSendSuggestionRequest = async (s: FriendSuggestion) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: s.user_id, status: 'pending' });
    if (!error) {
      await supabase.from('notifications').insert({ user_id: s.user_id, actor_id: user.id, type: 'friend_request', mood_id: null });
      // Database trigger will automatically queue push notification
      toast({ title: "Request sent!" }); setFriendSuggestions(prev => prev.filter(x => x.user_id !== s.user_id));
    }
  };

  const handleAcceptRequest = async (id: string, reqId: string) => {
    if (processingRequestId) return; // Prevent double-click
    setProcessingRequestId(id);

    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    if (!error) {
      if (user) {
        await supabase.from('notifications').insert({ user_id: reqId, actor_id: user.id, type: 'friend_request', mood_id: null });
        // Database trigger will automatically queue push notification
      }
      toast({ title: "Friend added! 🎉" });
      await fetchFriends();
      await fetchPendingRequests();
    } else {
      toast({ title: "Failed to accept request", variant: "destructive" });
    }

    setProcessingRequestId(null);
  };

  const handleRejectRequest = async (id: string) => {
    if (processingRequestId) return; // Prevent double-click
    setProcessingRequestId(id);

    const { error } = await supabase.from('friendships').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      await fetchPendingRequests();
    } else {
      toast({ title: "Failed to reject request", variant: "destructive" });
    }

    setProcessingRequestId(null);
  };

  const handleToggleCloseFriend = async (friendId: string) => {
    if (!user) {
      console.error("No user found");
      return;
    }

    console.log("Toggle close friend:", { userId: user.id, friendId, currentCloseFriends: closeFriends });

    const isClose = closeFriends.some(cf => cf.friend_id === friendId);

    if (isClose) {
      const { error, data } = await supabase
        .from('close_friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .select();

      if (error) {
        console.error("Error removing close friend:", error);
        toast({ title: "Failed to remove from close friends", variant: "destructive" });
        return;
      }
      console.log("Successfully removed close friend:", data);
      toast({ title: "Removed from close friends" });
    } else {
      const { error, data } = await supabase
        .from('close_friends')
        .insert({ user_id: user.id, friend_id: friendId })
        .select();

      if (error) {
        console.error("Error adding close friend:", error, {
          user_id: user.id,
          friend_id: friendId
        });
        toast({ title: "Failed to add to close friends", variant: "destructive" });
        return;
      }
      console.log("Successfully added close friend:", data);
      toast({ title: "Added to close friends! ⭐" });
    }

    await fetchCloseFriends();
  };

  const handleRemoveFriend = async (id: string) => {
    await supabase.from('friendships').delete().eq('id', id);
    toast({ title: "Friend removed" }); fetchFriends(); fetchCloseFriends();
  };

  const handleSendNudge = async (friendId: string, friendName: string) => {
    if (!user) return;
    // @ts-ignore
    const { error } = await supabase.from('nudges').insert({ sender_id: user.id, receiver_id: friendId });
    if (error) { toast({ title: "Could not send nudge", variant: "destructive" }); return; }
    // Database trigger will automatically queue push notification and in-app notification
    toast({ title: `Nudged ${friendName}! ⚡` });
  };

  const handleDismissNudge = async (nudgeId: string) => {
    if (!user) return;
    // @ts-ignore
    await supabase.from('nudges').delete().eq('id', nudgeId).eq('receiver_id', user.id);
    setNudges(prev => prev.filter(n => n.id !== nudgeId));
  };

  const handleNudgeBack = async (nudgeId: string, senderId: string, senderName: string) => {
    await handleSendNudge(senderId, senderName);
    await handleDismissNudge(nudgeId);
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 pb-28">
      {/* Zine Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-5xl font-black text-white uppercase tracking-tight"
            style={{
              fontFamily: "'Abril Fatface', serif",
              textShadow: "2px 2px 0px #C5A059, 4px 4px 0px rgba(0,0,0,0.3)"
            }}
          >
            FRIENDS
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(true)}
            className="relative p-3 bg-white/5 border border-white/10"
          >
            <Bell className="w-5 h-5 text-white/70" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white flex items-center justify-center text-[10px] font-bold"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] text-black font-bold text-xs uppercase tracking-wider"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <UserPlus className="w-4 h-4" /> Add
          </motion.button>
        </div>
      </div>

      {/* Section Tabs - Zine style */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "feed", label: "Feed", icon: Newspaper, count: null },
          { id: "friends", label: "All", icon: Users, count: friends.length },
          { id: "close", label: "Close", icon: Star, count: closeFriends.length },
          { id: "requests", label: "Inbox", icon: Mail, count: pendingRequests.length + nudges.length }
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`flex-1 py-2 px-3 flex items-center justify-center gap-1 border transition-all ${
              activeSection === s.id
                ? "bg-white text-black border-white"
                : "bg-transparent border-white/20 text-white/60 hover:border-white/40"
            }`}
          >
            {/* @ts-ignore */}
            <s.icon className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
              {s.label}
            </span>
            {s.count !== null && s.count > 0 && (
              <span className="text-[10px] ml-1">({s.count})</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DailyReel
              onFriendClick={setSelectedFriendId}
              highlightMoodId={highlightMoodId}
              highlightCommentId={highlightCommentId}
              onClearHighlight={() => { setHighlightMoodId(null); setHighlightCommentId(null); }}
              shouldOpenComments={shouldOpenComments}
            />
          </motion.div>
        )}

        {activeSection === "friends" && (
          <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {friends.map(f => (
              <div
                key={f.id}
                className="bg-white/5 border border-white/10 p-4 flex items-center justify-between"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedFriendId(f.friend_profile?.user_id || null)}
                >
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center overflow-hidden">
                    {f.friend_profile?.avatar_url ? (
                      <img
                        src={f.friend_profile.avatar_url}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <User className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                  <p
                    className="font-medium text-white text-sm uppercase tracking-wide"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {f.friend_profile?.display_name || f.friend_profile?.username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendNudge(f.friend_profile?.user_id || "", f.friend_profile?.username || "")}
                    className="p-2 text-white/40 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                    title="Nudge"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => handleToggleCloseFriend(f.friend_profile?.user_id || "")}
                    className={`p-2 transition-colors ${
                      closeFriends.some(c => c.friend_id === f.friend_profile?.user_id)
                        ? "text-[#C5A059]"
                        : "text-white/40 hover:text-[#C5A059]"
                    }`}
                  >
                    <Star className={`w-4 h-4 ${closeFriends.some(c => c.friend_id === f.friend_profile?.user_id) ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(f.id)}
                    className="p-2 text-white/40 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {friends.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40" style={{ fontFamily: "'Space Mono', monospace" }}>No friends yet</p>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === "close" && (
          <motion.div key="close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DailyReel onFriendClick={setSelectedFriendId} closeFriendsOnly={true} />
          </motion.div>
        )}

        {activeSection === "requests" && (
          <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <h3
                  className="text-[10px] text-white/40 uppercase tracking-[0.2em]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Friend Requests
                </h3>
                {pendingRequests.map(r => (
                  <div key={r.id} className="bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                    <p className="font-medium text-white text-sm">{r.friend_profile?.display_name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(r.id, r.requester_id)}
                        disabled={processingRequestId === r.id}
                        className="p-2 bg-[#C5A059] text-black disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(r.id)}
                        disabled={processingRequestId === r.id}
                        className="p-2 bg-white/10 text-white/60 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {nudges.length > 0 && (
              <div className="space-y-3">
                <h3
                  className="text-[10px] text-white/40 uppercase tracking-[0.2em]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Nudges
                </h3>
                {nudges.map((nudge) => (
                  <motion.div
                    key={nudge.id}
                    initial={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/20 flex items-center justify-center overflow-hidden">
                        {nudge.sender_profile?.avatar_url ? (
                          <img src={nudge.sender_profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          <span className="font-bold text-yellow-500">{nudge.sender_profile?.display_name || nudge.sender_profile?.username || "Someone"}</span> nudged you!
                        </p>
                        <p className="text-white/40 text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                          {formatDistanceToNow(new Date(nudge.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleNudgeBack(nudge.id, nudge.sender_id, nudge.sender_profile?.display_name || nudge.sender_profile?.username || "")}
                        className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500"
                        title="Nudge back"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={() => handleDismissNudge(nudge.id)}
                        className="p-2 bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-500"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {pendingRequests.length === 0 && nudges.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40" style={{ fontFamily: "'Space Mono', monospace" }}>No pending requests or nudges</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFriend && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowAddFriend(false)}
          >
            <div
              className="bg-[#1a1a1a] border border-white/10 p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between mb-4">
                <h3
                  className="text-xl font-bold text-white uppercase tracking-wide"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Add Friend
                </h3>
                <button onClick={() => setShowAddFriend(false)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  placeholder="@username"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  onClick={handleSearchUsername}
                  className="bg-[#C5A059] text-black hover:bg-[#C5A059]/80"
                >
                  Search
                </Button>
              </div>
              {searchError && (
                <p className="mt-2 text-red-400 text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                  {searchError}
                </p>
              )}
              {searchResult && (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 flex justify-between items-center">
                  <p className="font-bold text-white">@{searchResult.username}</p>
                  <Button
                    onClick={handleSendRequest}
                    disabled={isSearching}
                    className="bg-[#C5A059] text-black hover:bg-[#C5A059]/80"
                  >
                    {isSearching ? "Sending..." : "Add"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      <FriendProfileModal friendId={selectedFriendId} onClose={() => setSelectedFriendId(null)} />

      <NotificationsSheet
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationClick={(type, actorId, moodId) => {
          if (type === "friend_request") {
            setActiveSection("requests");
          } else if (moodId) {
            setActiveSection("feed");
            setHighlightMoodId(moodId);
            setShouldOpenComments(type === 'comment');
          } else {
            setSelectedFriendId(actorId);
          }
        }}
      />
    </div>
  );
};

export default FriendsTab;