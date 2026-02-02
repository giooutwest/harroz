import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DefaultTag {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface UserTag {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface MoodTag {
  tag_id: string;
  tag_type: "default" | "custom";
}

interface RoutineTagsProps {
  moodId: string | null;
  onTagsChange?: (tags: MoodTag[]) => void;
  pendingTags?: MoodTag[];
}

const RoutineTags = ({ moodId, onTagsChange, pendingTags = [] }: RoutineTagsProps) => {
  const [defaultTags, setDefaultTags] = useState<DefaultTag[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<MoodTag[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagIcon, setNewTagIcon] = useState("✨");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Common emoji options for custom tags
  const emojiOptions = ["✨", "🎯", "💪", "📱", "🎮", "🎨", "🎵", "☕", "🍎", "🚶", "🧹", "💼", "🛒", "📞", "✍️", "🎓"];

  useEffect(() => {
    fetchTags();
  }, [user]);

  useEffect(() => {
    if (moodId) {
      fetchMoodTags();
    } else {
      // Use pending tags from parent when no moodId
      setSelectedTags(pendingTags);
    }
  }, [moodId, pendingTags]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      // Fetch default tags
      const { data: defaults } = await supabase
        .from("default_routine_tags")
        .select("*")
        .order("sort_order");

      if (defaults) setDefaultTags(defaults);

      // Fetch user's custom tags
      if (user) {
        const { data: customs } = await supabase
          .from("user_routine_tags")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order");

        if (customs) setUserTags(customs);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoodTags = async () => {
    if (!moodId) return;

    const { data } = await supabase
      .from("mood_routine_tags")
      .select("tag_id, tag_type")
      .eq("mood_id", moodId);

    if (data) {
      setSelectedTags(data);
    }
  };

  const toggleTag = async (tagId: string, tagType: "default" | "custom") => {
    const isSelected = selectedTags.some(t => t.tag_id === tagId && t.tag_type === tagType);

    // Find tag name for feedback
    const tag = tagType === "default"
      ? defaultTags.find(t => t.id === tagId)
      : userTags.find(t => t.id === tagId);

    if (isSelected) {
      // Remove tag
      if (moodId) {
        await supabase
          .from("mood_routine_tags")
          .delete()
          .eq("mood_id", moodId)
          .eq("tag_id", tagId)
          .eq("tag_type", tagType);
      }

      const newTags = selectedTags.filter(t => !(t.tag_id === tagId && t.tag_type === tagType));
      setSelectedTags(newTags);
      onTagsChange?.(newTags);
    } else {
      // Add tag
      if (moodId) {
        await supabase
          .from("mood_routine_tags")
          .insert({
            mood_id: moodId,
            tag_id: tagId,
            tag_type: tagType
          });
      }

      const newTags = [...selectedTags, { tag_id: tagId, tag_type: tagType }];
      setSelectedTags(newTags);
      onTagsChange?.(newTags);

      // Show feedback for adding tag
      if (tag) {
        toast.success(`${tag.icon} ${tag.name} added!`, { duration: 1500 });
      }
    }
  };

  const handleAddCustomTag = async () => {
    if (!user || !newTagName.trim()) return;

    const { data, error } = await supabase
      .from("user_routine_tags")
      .insert({
        user_id: user.id,
        name: newTagName.trim(),
        icon: newTagIcon,
        sort_order: userTags.length
      })
      .select()
      .single();

    if (!error && data) {
      setUserTags([...userTags, data]);
      setNewTagName("");
      setNewTagIcon("✨");
      setShowAddModal(false);
    }
  };

  const deleteCustomTag = async (tagId: string) => {
    await supabase
      .from("user_routine_tags")
      .delete()
      .eq("id", tagId);

    setUserTags(userTags.filter(t => t.id !== tagId));
    setSelectedTags(selectedTags.filter(t => !(t.tag_id === tagId && t.tag_type === "custom")));
  };

  const isTagSelected = (tagId: string, tagType: "default" | "custom") => {
    return selectedTags.some(t => t.tag_id === tagId && t.tag_type === tagType);
  };

  if (isLoading) return null;

  return (
    <div className="mt-4">
      <p className="text-muted-foreground mb-2 text-xs">
        What did you do today?
      </p>

      <div className="flex flex-wrap gap-2">
        {/* Default tags */}
        {defaultTags.map((tag) => (
          <motion.button
            key={`default-${tag.id}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleTag(tag.id, "default")}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all ${
              isTagSelected(tag.id, "default")
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/50"
            } rounded-full`}
          >
            <span className="text-sm">{tag.icon}</span>
            <span className="text-xs">{tag.name}</span>
            {isTagSelected(tag.id, "default") && (
              <Check className="w-3 h-3" />
            )}
          </motion.button>
        ))}

        {/* User custom tags */}
        {userTags.map((tag) => (
          <motion.div
            key={`custom-${tag.id}`}
            className="relative group"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleTag(tag.id, "custom")}
              className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all ${
                isTagSelected(tag.id, "custom")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50"
              } rounded-full`}
            >
              <span className="text-sm">{tag.icon}</span>
              <span className="text-xs">{tag.name}</span>
              {isTagSelected(tag.id, "custom") && (
                <Check className="w-3 h-3" />
              )}
            </motion.button>
            {/* Delete button on hover */}
            <button
              onClick={() => deleteCustomTag(tag.id)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            >
              <X className="w-2 h-2" />
            </button>
          </motion.div>
        ))}

        {/* Add custom tag button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border hover:border-primary/50 transition-colors rounded-full"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">Add</span>
        </motion.button>
      </div>

      {/* Add Custom Tag Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border p-6 w-full max-w-sm rounded-2xl"
            >
              <h3 className="font-semibold mb-4 text-lg">
                Add Custom Tag
              </h3>

              {/* Emoji picker */}
              <div className="mb-4">
                <p className="text-muted-foreground mb-2 text-xs">
                  Choose an icon
                </p>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewTagIcon(emoji)}
                      className={`w-10 h-10 flex items-center justify-center border-2 transition-colors ${
                        newTagIcon === emoji
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      } rounded-lg`}
                    >
                      <span className="text-lg">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag name input */}
              <div className="mb-4">
                <p className="text-muted-foreground mb-2 text-xs">
                  Tag name
                </p>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Called mom"
                  maxLength={20}
                  className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary outline-none text-sm rounded-lg"
                />
              </div>

              {/* Preview */}
              <div className="mb-4">
                <p className="text-muted-foreground mb-2 text-xs">
                  Preview
                </p>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full"
                >
                  <span>{newTagIcon}</span>
                  <span className="text-xs">
                    {newTagName || "Tag name"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50 text-sm rounded-lg"
                >
                  Add Tag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutineTags;
