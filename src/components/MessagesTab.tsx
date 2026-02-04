import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, User, Circle, MessageCirclePlus, X, Mic, Check, CheckCheck, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow, format } from "date-fns";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import ZineConversationCard from "./ZineConversationCard";

interface MessagesTabProps {
  onFriendClick?: (friendId: string) => void;
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  message_type?: 'text' | 'voice' | 'image';
  voice_url?: string | null;
  voice_duration?: number | null;
  delivered_at?: string | null;
  read_at?: string | null;
  reactions?: MessageReaction[];
}

interface Conversation {
  friend_id: string;
  friend_name: string;
  friend_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
}

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const MessagesTab = ({ onFriendClick }: MessagesTabProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<{
    id: string;
    name: string;
    avatar: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState<{ [key: string]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchFriends();
      subscribeToMessages();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
      markMessagesAsRead(selectedFriend.id);
    }
  }, [selectedFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const subscribeToMessages = () => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;

          // Update conversations list
          fetchConversations();

          // If viewing this conversation, add message to list
          if (selectedFriend &&
              (newMsg.sender_id === selectedFriend.id || newMsg.receiver_id === selectedFriend.id)) {
            setMessages(prev => [...prev, newMsg]);
            markMessagesAsRead(selectedFriend.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get all messages involving the user
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const convMap = new Map<string, Conversation>();

      for (const msg of messagesData || []) {
        const friendId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (!convMap.has(friendId)) {
          // Fetch friend profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', friendId)
            .single();

          convMap.set(friendId, {
            friend_id: friendId,
            friend_name: profile?.display_name || 'Friend',
            friend_avatar: profile?.avatar_url || null,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            is_sender: msg.sender_id === user.id
          });
        }
      }

      // Count unread messages per conversation
      for (const [friendId, conv] of convMap.entries()) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', friendId)
          .eq('receiver_id', user.id)
          .eq('read', false);

        conv.unread_count = count || 0;
      }

      setConversations(Array.from(convMap.values()));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch reactions for all messages
    const messageIds = data?.map(m => m.id) || [];
    let reactionsMap: { [key: string]: MessageReaction[] } = {};

    if (messageIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (reactionsData) {
        reactionsData.forEach(r => {
          if (!reactionsMap[r.message_id]) {
            reactionsMap[r.message_id] = [];
          }
          reactionsMap[r.message_id].push(r);
        });
      }
    }

    // Add reactions to messages and generate signed URLs for voice messages
    const messagesWithExtras = await Promise.all((data || []).map(async (msg) => {
      let voiceSignedUrl = null;
      if (msg.voice_url) {
        const { data: signedData } = await supabase.storage
          .from('mood-photos')
          .createSignedUrl(msg.voice_url, 3600);
        voiceSignedUrl = signedData?.signedUrl || null;
      }

      return {
        ...msg,
        reactions: reactionsMap[msg.id] || [],
        voice_url: voiceSignedUrl || msg.voice_url
      };
    }));

    setMessages(messagesWithExtras);
  };

  const markMessagesAsRead = async (friendId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('sender_id', friendId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    fetchConversations();
  };

  // Handle message tap (single tap shows time, double tap reacts)
  const handleMessageTap = useCallback((msg: Message) => {
    const now = Date.now();
    const lastTap = lastTapTime[msg.id] || 0;
    const timeDiff = now - lastTap;

    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap - add reaction
      handleAddReaction(msg.id, '❤️');
      setLastTapTime(prev => ({ ...prev, [msg.id]: 0 }));
    } else {
      // Single tap - toggle timestamp
      setExpandedMessageId(prev => prev === msg.id ? null : msg.id);
      setLastTapTime(prev => ({ ...prev, [msg.id]: now }));
    }
  }, [lastTapTime]);

  // Add reaction to message
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Remove reaction if same emoji, or update if different
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add new reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });
      }

      // Refresh messages to show updated reactions
      if (selectedFriend) {
        fetchMessages(selectedFriend.id);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Send voice message
  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!user || !selectedFriend) return;

    setSending(true);
    setIsRecording(false);

    try {
      // Upload audio to storage
      const fileName = `${user.id}/voice/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('mood-photos')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm'
        });

      if (uploadError) throw uploadError;

      // Create message with voice
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: '🎤 Voice message',
          message_type: 'voice',
          voice_url: fileName,
          voice_duration: duration
        });

      if (error) throw error;

      fetchMessages(selectedFriend.id);
      fetchConversations();
    } catch (error) {
      console.error('Error sending voice:', error);
      toast({ title: "Failed to send voice message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedFriend || !newMessage.trim()) return;

    setSending(true);

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedFriend.id,
        content: newMessage.trim()
      });

    setSending(false);

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      return;
    }

    setNewMessage("");
    fetchMessages(selectedFriend.id);
    fetchConversations();
  };

  const fetchFriends = async () => {
    if (!user) return;

    try {
      // Get all accepted friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      // Extract friend IDs
      const friendIds = friendshipsData?.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // Fetch friend profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      setFriends(profilesData || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleStartNewConversation = (friend: Friend) => {
    setSelectedFriend({
      id: friend.user_id,
      name: friend.display_name || friend.username || 'Friend',
      avatar: friend.avatar_url
    });
    setShowNewMessageModal(false);
    setSearchQuery("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredFriends = friends.filter(friend => {
    const name = (friend.display_name || friend.username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-[#f5f0e8]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-black border-t-transparent"
        />
      </div>
    );
  }

  // Conversation view - Brutalist cream style
  if (selectedFriend) {
    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-200px)] bg-[#f5f0e8]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b-2 border-black/10 bg-[#f5f0e8]">
          <button
            onClick={() => setSelectedFriend(null)}
            className="p-2 hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <button
            onClick={() => onFriendClick?.(selectedFriend.id)}
            className="flex items-center gap-3 flex-1"
          >
            <Avatar className="border-2 border-black/20">
              {selectedFriend.avatar && <AvatarImage src={selectedFriend.avatar} />}
              <AvatarFallback className="bg-black text-white">{selectedFriend.name[0]}</AvatarFallback>
            </Avatar>
            <span
              className="font-bold text-black uppercase tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {selectedFriend.name}
            </span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f5f0e8]">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p
                className="text-black/40 text-sm"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                No messages yet. Say hi!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const isExpanded = expandedMessageId === msg.id;
              const hasReactions = msg.reactions && msg.reactions.length > 0;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <motion.div
                    onClick={() => handleMessageTap(msg)}
                    className={`max-w-[75%] px-4 py-2 relative cursor-pointer select-none ${
                      isMine
                        ? "bg-black text-white"
                        : "bg-white border-2 border-black/10 text-black"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Voice message or text */}
                    {msg.message_type === 'voice' && msg.voice_url ? (
                      <VoiceMessage
                        audioUrl={msg.voice_url}
                        duration={msg.voice_duration || 0}
                        isMine={isMine}
                      />
                    ) : (
                      <p
                        className="break-words text-sm"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {msg.content}
                      </p>
                    )}

                    {/* Reactions badge */}
                    {hasReactions && (
                      <div
                        className={`absolute -bottom-2 ${isMine ? 'left-2' : 'right-2'} flex items-center gap-0.5 px-1.5 py-0.5 bg-white border-2 border-black/10 shadow-sm`}
                      >
                        {msg.reactions?.map((r, i) => (
                          <span key={i} className="text-xs">{r.emoji}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* Timestamp and read status - shown on tap */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-2 mt-1 ${isMine ? "flex-row-reverse" : ""}`}
                      >
                        <span
                          className="text-[10px] text-black/40"
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        >
                          {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                        </span>

                        {/* Read/Delivered indicator for sent messages */}
                        {isMine && (
                          <span
                            className="flex items-center text-[10px] text-black/40"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            {msg.read_at ? (
                              <>
                                <CheckCheck className="w-3 h-3 mr-0.5 text-black" />
                                Read {format(new Date(msg.read_at), 'h:mm a')}
                              </>
                            ) : msg.delivered_at ? (
                              <>
                                <CheckCheck className="w-3 h-3 mr-0.5" />
                                Delivered
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 mr-0.5" />
                                Sent
                              </>
                            )}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Compact read indicator */}
                  {!isExpanded && isMine && (
                    <div className="flex items-center mt-0.5">
                      {msg.read_at ? (
                        <CheckCheck className="w-3 h-3 text-black" />
                      ) : msg.delivered_at ? (
                        <CheckCheck className="w-3 h-3 text-black/40" />
                      ) : (
                        <Check className="w-3 h-3 text-black/40" />
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t-2 border-black/10 bg-[#f5f0e8]">
          <AnimatePresence mode="wait">
            {isRecording ? (
              <VoiceRecorder
                key="recorder"
                onSend={handleSendVoice}
                onCancel={() => setIsRecording(false)}
              />
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="bg-white border-2 border-black/10 text-black placeholder:text-black/30"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />

                {/* Mic button - show when no text */}
                {!newMessage.trim() && (
                  <button
                    onClick={() => setIsRecording(true)}
                    className="p-2 bg-black/10 text-black hover:bg-black/20 transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                {/* Send button - show when has text */}
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`p-2 bg-black text-white disabled:opacity-50 ${!newMessage.trim() ? "hidden" : ""}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Conversations list - Zine INBOX style
  return (
    <>
      <div className="min-h-screen bg-[#f5f0e8] pb-28">
        {/* Zine INBOX Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="text-6xl font-black text-black uppercase tracking-tighter"
                style={{ fontFamily: "'Abril Fatface', serif" }}
              >
                INBOX
              </h1>
              <p
                className="text-[10px] text-black/40 uppercase tracking-[0.2em] mt-1"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="p-3 bg-black text-white hover:bg-black/80 transition-colors"
            >
              <MessageCirclePlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div
              className="relative w-24 h-24 bg-white border-2 border-black/10 p-2 mb-6"
              style={{ transform: "rotate(3deg)" }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Circle className="w-8 h-8 text-black/20" />
              </div>
            </div>
            <p
              className="text-black/40 text-sm uppercase tracking-wider"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              No messages yet
            </p>
            <p
              className="text-black/30 text-xs mt-2 italic"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tap + to start a conversation
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-0">
            {conversations.map((conv, index) => (
              <ZineConversationCard
                key={conv.friend_id}
                friendName={conv.friend_name}
                friendAvatar={conv.friend_avatar}
                lastMessage={conv.last_message}
                lastMessageTime={formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                unreadCount={conv.unread_count}
                isSender={conv.is_sender}
                index={index}
                onClick={() =>
                  setSelectedFriend({
                    id: conv.friend_id,
                    name: conv.friend_name,
                    avatar: conv.friend_avatar
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* New Message Modal - Zine style */}
      <AnimatePresence>
        {showNewMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowNewMessageModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f5f0e8] border-t-2 border-black/10 w-full sm:max-w-md max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b-2 border-black/10">
                <h3
                  className="font-bold text-black uppercase tracking-wide"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  New Message
                </h3>
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="p-2 hover:bg-black/10 transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Search */}
              <div className="flex-shrink-0 p-4 border-b-2 border-black/10">
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border-2 border-black/10 text-black placeholder:text-black/30"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>

              {/* Friends List */}
              <div className="flex-1 overflow-y-auto p-4">
                {friends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <User className="w-12 h-12 mb-3 text-black/20" />
                    <p
                      className="text-black/40 text-sm"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      No friends yet
                    </p>
                    <p
                      className="text-black/30 text-xs mt-1 italic"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Add friends to start messaging!
                    </p>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <p
                      className="text-black/40 text-sm"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      No friends found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                      <motion.button
                        key={friend.user_id}
                        onClick={() => handleStartNewConversation(friend)}
                        className="w-full p-3 bg-white border-2 border-black/10 hover:border-black/30 transition-colors text-left flex items-center gap-3"
                        whileTap={{ scale: 0.98 }}
                      >
                        <Avatar className="border-2 border-black/20">
                          {friend.avatar_url && <AvatarImage src={friend.avatar_url} />}
                          <AvatarFallback className="bg-black text-white">
                            {(friend.display_name || friend.username || 'F')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p
                            className="font-bold text-black text-sm uppercase tracking-wide"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {friend.display_name || friend.username || 'Friend'}
                          </p>
                          {friend.username && friend.display_name && (
                            <p
                              className="text-black/40 text-xs"
                              style={{ fontFamily: "'Space Mono', monospace" }}
                            >
                              @{friend.username}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessagesTab;
