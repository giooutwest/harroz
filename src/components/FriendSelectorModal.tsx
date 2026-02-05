import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Users, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SelectedFriend {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (friends: SelectedFriend[]) => void;
  initialSelected?: SelectedFriend[];
}

interface FriendProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const FriendSelectorModal = ({
  isOpen,
  onClose,
  onSelect,
  initialSelected = [],
}: FriendSelectorModalProps) => {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendProfile[]>([]);
  const [selected, setSelected] = useState<SelectedFriend[]>(initialSelected);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
      setSelected(initialSelected);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredFriends(
        friends.filter(
          (f) =>
            f.display_name?.toLowerCase().includes(query) ||
            f.username?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      setFilteredFriends([]);
      setLoading(false);
      return;
    }

    // Extract friend IDs
    const friendIds = friendships.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch friend profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", friendIds);

    if (profiles) {
      setFriends(profiles);
      setFilteredFriends(profiles);
    }

    setLoading(false);
  };

  const toggleFriend = (friend: FriendProfile) => {
    setSelected((prev) => {
      const isSelected = prev.some((f) => f.user_id === friend.user_id);
      if (isSelected) {
        return prev.filter((f) => f.user_id !== friend.user_id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full sm:max-w-md sm:rounded-xl border border-border overflow-hidden"
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Tag Friends</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  autoFocus
                />
              </div>
            </div>

            {/* Selected Preview */}
            {selected.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {selected.map((friend) => (
                    <motion.button
                      key={friend.user_id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => toggleFriend(friend)}
                      className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      {friend.display_name || friend.username}
                      <X className="w-3 h-3" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="overflow-y-auto" style={{ maxHeight: "45vh" }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? "No friends found" : "No friends yet"}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isSelected = selected.some(
                    (f) => f.user_id === friend.user_id
                  );
                  return (
                    <motion.button
                      key={friend.user_id}
                      onClick={() => toggleFriend(friend)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        {friend.avatar_url && (
                          <AvatarImage src={friend.avatar_url} />
                        )}
                        <AvatarFallback className="bg-secondary">
                          {(friend.display_name || friend.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground text-sm">
                          {friend.display_name || friend.username}
                        </p>
                        {friend.username && friend.display_name && (
                          <p className="text-xs text-muted-foreground">
                            @{friend.username}
                          </p>
                        )}
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Confirm Button */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleConfirm}
                className="w-full"
                disabled={loading}
              >
                {selected.length > 0
                  ? `Tag ${selected.length} Friend${selected.length > 1 ? "s" : ""}`
                  : "Done"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FriendSelectorModal;
