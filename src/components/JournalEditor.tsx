import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, X, Save, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JournalEntry } from "@/hooks/useJournalEntry";

interface JournalEditorProps {
  existingEntry?: JournalEntry | null;
  existingPhotoUrls?: string[];
  onSave: (content: string, newPhotos: File[], existingPhotoPaths: string[]) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onCancel: () => void;
  canEdit?: boolean;
}

const MAX_CONTENT_LENGTH = 5000;
const MAX_PHOTOS = 10;

const JournalEditor = ({
  existingEntry,
  existingPhotoUrls = [],
  onSave,
  onDelete,
  onCancel,
  canEdit = true
}: JournalEditorProps) => {
  const [content, setContent] = useState(existingEntry?.content || "");
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotosPreviews, setNewPhotosPreviews] = useState<string[]>([]);
  const [existingPhotoPaths, setExistingPhotoPaths] = useState<string[]>(existingEntry?.photos || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync with existing entry when it changes
  useEffect(() => {
    if (existingEntry) {
      setContent(existingEntry.content || "");
      setExistingPhotoPaths(existingEntry.photos || []);
    }
  }, [existingEntry]);

  const totalPhotos = existingPhotoPaths.length + newPhotos.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total photo limit
    const remainingSlots = MAX_PHOTOS - totalPhotos;
    if (remainingSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: `Maximum ${MAX_PHOTOS} photos per entry`,
        variant: "destructive"
      });
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const validFiles: File[] = [];
    const previews: string[] = [];

    filesToAdd.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive"
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format`,
          variant: "destructive"
        });
        return;
      }
      validFiles.push(file);
    });

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === validFiles.length) {
          setNewPhotos(prev => [...prev, ...validFiles]);
          setNewPhotosPreviews(prev => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setNewPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotoPaths(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canEdit) return;

    setIsSaving(true);
    try {
      const success = await onSave(content, newPhotos, existingPhotoPaths);
      if (success) {
        toast({ title: "Journal saved!" });
        // Clear new photos after successful save
        setNewPhotos([]);
        setNewPhotosPreviews([]);
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      const success = await onDelete();
      if (success) {
        toast({ title: "Journal entry deleted" });
        onCancel();
      } else {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content textarea */}
      <div className="flex-1 relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
          placeholder="Write about your day..."
          disabled={!canEdit}
          className={`w-full h-full min-h-[200px] p-4 bg-transparent border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm rounded-xl ${!canEdit ? "opacity-60" : ""}`}
        />
        <div className="absolute bottom-2 right-2 text-muted-foreground text-xs">
          {content.length}/{MAX_CONTENT_LENGTH}
        </div>
      </div>

      {/* Photo gallery */}
      {(existingPhotoPaths.length > 0 || newPhotosPreviews.length > 0 || existingPhotoUrls.length > 0) && (
        <div className="mt-4">
          <div className="text-muted-foreground mb-2 text-xs">
            Photos ({totalPhotos}/{MAX_PHOTOS})
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Existing photos with signed URLs */}
            {existingPhotoUrls.map((url, index) => (
              <div
                key={`existing-${index}`}
                className="relative w-20 h-20 overflow-hidden rounded-lg"
              >
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {canEdit && (
                  <button
                    onClick={() => removeExistingPhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* New photo previews */}
            {newPhotosPreviews.map((preview, index) => (
              <div
                key={`new-${index}`}
                className="relative w-20 h-20 overflow-hidden rounded-lg"
              >
                <img
                  src={preview}
                  alt={`New photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {canEdit && (
                  <button
                    onClick={() => removeNewPhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add photo button */}
            {canEdit && totalPhotos < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-lg"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        {/* Add photo button (when no photos) */}
        {canEdit && totalPhotos === 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-full"
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm">Add Photos</span>
          </motion.button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <div className="flex-1" />

        {/* Delete button */}
        {canEdit && existingEntry && onDelete && (
          <>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-xs">Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-destructive text-destructive-foreground text-xs rounded-full"
                >
                  {isDeleting ? "..." : "Yes"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-secondary text-xs rounded-full"
                >
                  No
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-muted-foreground hover:text-destructive rounded-full"
              >
                <Trash2 className="w-5 h-5" />
              </motion.button>
            )}
          </>
        )}

        {/* Cancel button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-foreground rounded-full"
        >
          <span className="text-sm">Cancel</span>
        </motion.button>

        {/* Save button */}
        {canEdit && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving || (!content.trim() && totalPhotos === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50 rounded-full"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm">
              {isSaving ? "Saving..." : "Save"}
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default JournalEditor;
