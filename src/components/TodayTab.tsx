import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, CloudRain, Cloud, Sun, Star, Camera, X, MessageCircle, User, Lock, Pencil, Flame, Share2, Users, BookOpen, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PixelStorm, PixelRain, PixelCloudy, PixelPartlyCloudy, PixelSunny } from "./PixelIcons";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { getLocalDateString } from "@/hooks/useTimeWindow";
import { useTimeWindowStatic } from "@/hooks/useTimeWindowStatic";
import CountdownTimer from "./CountdownTimer";
import MoodEngagementSheet from "./MoodEngagementSheet";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import TodayTabNav, { TodaySection } from "./TodayTabNav";
import PinEntryModal from "./PinEntryModal";
import JournalEditor from "./JournalEditor";
import { useJournalPin } from "@/hooks/useJournalPin";
import { useJournalEntry } from "@/hooks/useJournalEntry";
import { useStreak } from "@/hooks/useStreak";
import RoutineTags from "./RoutineTags";
import FitCheckChallenge from "./FitCheckChallenge";
import ZineLockedView from "./ZineLockedView";
import ZineOpenView from "./ZineOpenView";
import MoodCamera from "./MoodCamera";
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";

type Visibility = "private" | "friends" | "close_friends";

interface TodayTabProps {
  // Props removed - zine is now the only theme
}

interface Liker {
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
  } | null;
}

const moodQuotes = {
  low: [
    "Tomorrow is a fresh start. You've got this! 💪",
    "Stormy days don't last forever. Sunshine is coming!",
    "It's okay to feel this way. You're doing amazing.",
    "Every cloud has a silver lining. Keep going!",
  ],
  mid: [
    "You're navigating beautifully. One step at a time! 🌤️",
    "Balance is beautiful. You're finding your way!",
    "Every day is progress. You're doing great!",
    "The best is yet to come. Keep shining!",
  ],
  high: [
    "What a beautiful day! Your energy is contagious! ☀️",
    "You're absolutely radiant today!",
    "The sun is shining and so are you!",
    "This amazing energy looks great on you!",
  ],
};

const getMoodIcon = (rating: number, isPixel: boolean) => {
  if (isPixel) {
    if (rating <= 2) return PixelStorm;
    if (rating <= 4) return PixelRain;
    if (rating <= 6) return PixelCloudy;
    if (rating <= 8) return PixelPartlyCloudy;
    return PixelSunny;
  }
  if (rating <= 2) return CloudRain;
  if (rating <= 4) return Cloud;
  if (rating <= 6) return Sun;
  if (rating <= 8) return Star;
  return Sparkles;
};

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
  return "Bright & sunny!";
};

const TodayTab = ({}: TodayTabProps) => {
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submittedRating, setSubmittedRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [todaysMood, setTodaysMood] = useState<number | null>(null);
  const [todaysMoodId, setTodaysMoodId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [isVideoMedia, setIsVideoMedia] = useState(false);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("friends");
  const [isUploading, setIsUploading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [recentLikers, setRecentLikers] = useState<Liker[]>([]);
  const [showEngagementSheet, setShowEngagementSheet] = useState(false);
  const [showYesterdayEngagement, setShowYesterdayEngagement] = useState(false);
  
  const [yesterdaysMood, setYesterdaysMood] = useState<{
    id: string;
    rating: number;
    photo_url: string | null;
    caption: string | null;
    likes_count: number;
    comments_count: number;
  } | null>(null);
  
  const [showYesterdaySummary, setShowYesterdaySummary] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Journal state
  const [activeSection, setActiveSection] = useState<TodaySection>("post");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"setup" | "verify">("verify");
  const [isJournalUnlocked, setIsJournalUnlocked] = useState(false);
  const [showFitCheckCamera, setShowFitCheckCamera] = useState(false);

  // Room entry state - persists for the day
  const [hasEnteredRoom, setHasEnteredRoom] = useState(() => {
    const today = getLocalDateString();
    const stored = localStorage.getItem(`roz-room-entered-${today}`);
    return stored === "true";
  });

  // Mood camera state
  const [showMoodCamera, setShowMoodCamera] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [cameraMode, setCameraMode] = useState<"camera" | "gallery">("camera");
  const [showGalleryFeature, setShowGalleryFeature] = useState(false);

  // Tags state (before mood is created)
  const [pendingTags, setPendingTags] = useState<{tag_id: string; tag_type: "default" | "custom"}[]>([]);

  // Feature discovery
  const { shouldShowTooltip, markDiscovered } = useFeatureDiscovery();

  const shareRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const timeWindow = useTimeWindowStatic();
  const { currentStreak } = useStreak();

  // Journal hooks
  const journalPin = useJournalPin();
  const todayDate = getLocalDateString();
  const journalEntry = useJournalEntry(todayDate);

  useEffect(() => {
    if (user) {
      // Parallelize all initial data fetches for faster load
      Promise.all([
        checkTodaysMood(),
        fetchDisplayName(),
        checkYesterdaysMood()
      ]);
    }
  }, [user]);

  const checkYesterdaysMood = async () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const { data } = await supabase
      .from('moods')
      .select('id, rating, photo_url, caption')
      .eq('date', yesterdayStr)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      let photoUrl = null;
      if (data.photo_url) {
        const { data: signedData } = await supabase.storage.from('mood-photos').createSignedUrl(data.photo_url, 3600);
        photoUrl = signedData?.signedUrl || null;
      }
      const { count: likes } = await supabase.from('mood_likes').select('*', { count: 'exact', head: true }).eq('mood_id', data.id);
      const { count: comments } = await supabase.from('mood_comments').select('*', { count: 'exact', head: true }).eq('mood_id', data.id);

      setYesterdaysMood({ 
        id: data.id,
        rating: data.rating, 
        photo_url: photoUrl, 
        caption: data.caption,
        likes_count: likes || 0,
        comments_count: comments || 0
      });
      setShowYesterdaySummary(true);
    }
  };

  const dismissYesterdaySummary = () => setShowYesterdaySummary(false);

  const fetchDisplayName = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('display_name, default_visibility').eq('user_id', user.id).maybeSingle();
    if (data) {
      if (data.display_name) setDisplayName(data.display_name);
      if (data.default_visibility) setVisibility(data.default_visibility as Visibility);
    }
  };

  const checkTodaysMood = async () => {
    if (!user) return;
    const today = getLocalDateString();
    const { data } = await supabase
      .from('moods')
      .select('id, rating, photo_url, caption, visibility')
      .eq('date', today)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setTodaysMood(data.rating);
      setTodaysMoodId(data.id);
      setSubmittedRating(data.rating);
      setSubmitted(true);
      setQuote(getRandomQuote(data.rating));
      if (data.visibility) setVisibility(data.visibility as Visibility);
      if (data.photo_url) {
        setExistingPhotoPath(data.photo_url);
        const { data: signedData } = await supabase.storage.from('mood-photos').createSignedUrl(data.photo_url, 3600);
        if (signedData?.signedUrl) setPhotoPreview(signedData.signedUrl);
      }
      if (data.caption) setCaption(data.caption);
      
      const { data: likesData, count: likesCountVal } = await supabase
        .from('mood_likes')
        .select('user_id, profiles(username, avatar_url, display_name)', { count: 'exact' })
        .eq('mood_id', data.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setLikesCount(likesCountVal || 0);
      // @ts-ignore
      setRecentLikers(likesData || []);
      
      const { count: comments } = await supabase.from('mood_comments').select('id', { count: 'exact' }).eq('mood_id', data.id).neq('user_id', user.id);
      setCommentsCount(comments || 0);
    }
  };

  const getRandomQuote = (r: number) => {
    const category = r <= 4 ? "low" : r <= 7 ? "mid" : "high";
    const quotes = moodQuotes[category];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  const handleCameraCapture = (blob: Blob, previewUrl: string, isVideo?: boolean) => {
    // Convert blob to File for upload
    const ext = isVideo ? 'mp4' : 'jpg';
    const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
    const file = new File([blob], `mood-${Date.now()}.${ext}`, { type: mimeType });
    setPhoto(file);
    setPhotoPreview(previewUrl);
    setIsVideoMedia(!!isVideo);
  };

  // Open camera with specified mode
  const openPhotoCapture = (mode: "camera" | "gallery") => {
    setCameraMode(mode);
    setShowPhotoOptions(false);
    setShowMoodCamera(true);
  };

  // Handle add photo button click - show feature discovery first time
  const handleAddPhotoClick = () => {
    if (shouldShowTooltip("gallery-upload")) {
      setShowGalleryFeature(true);
    } else {
      setShowPhotoOptions(true);
    }
  };

  // After seeing gallery feature discovery, show options
  const handleGalleryFeatureDismiss = () => {
    markDiscovered("gallery-upload");
    setShowGalleryFeature(false);
    setShowPhotoOptions(true);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setExistingPhotoPath(null);
    setCaption("");
    setIsVideoMedia(false);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo || !user) return null;
    const today = getLocalDateString();
    const fileExt = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${today}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('mood-photos').upload(fileName, photo);
    if (error) { console.error("Upload failed", error); return null; }
    return fileName;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!photo && !photoPreview) {
      toast({ title: "Photo or video required 📸", description: "Show your friends what you did today!", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    const today = getLocalDateString();
    let finalPhotoPath = existingPhotoPath;

    if (photo) {
      const uploadedPath = await uploadPhoto();
      if (!uploadedPath) {
        setIsUploading(false);
        toast({ title: "Upload Failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      finalPhotoPath = uploadedPath;
    }
    
    // 🔥 FIXED: Removed 'note' column
    const { data: upsertedMood, error } = await supabase
      .from('moods')
      .upsert({
        rating,
        date: today,
        user_id: user.id,
        photo_url: finalPhotoPath,
        caption: caption || null,
        visibility
      }, {
        onConflict: 'user_id,date'
      })
      .select('id')
      .single();

    if (error) {
      setIsUploading(false);
      console.error(error);
      toast({ title: "Oops!", description: "Couldn't save your mood.", variant: "destructive" });
      return;
    }

    // Save pending tags if any
    if (upsertedMood?.id && pendingTags.length > 0) {
      const tagsToInsert = pendingTags.map(tag => ({
        mood_id: upsertedMood.id,
        tag_id: tag.tag_id,
        tag_type: tag.tag_type
      }));

      // First delete existing tags for this mood, then insert new ones
      // @ts-ignore - mood_routine_tags table exists but not in generated types
      await supabase.from('mood_routine_tags').delete().eq('mood_id', upsertedMood.id);
      // @ts-ignore - mood_routine_tags table exists but not in generated types
      await supabase.from('mood_routine_tags').insert(tagsToInsert);

      // Update todaysMoodId so RoutineTags can work with it
      setTodaysMoodId(upsertedMood.id);
    } else if (upsertedMood?.id) {
      setTodaysMoodId(upsertedMood.id);
    }

    setIsUploading(false);
    fetchDisplayName();
    setSubmittedRating(rating);
    setQuote(getRandomQuote(rating));
    setSubmitted(true);
    setIsEditing(false);
    setTodaysMood(rating);
    if (finalPhotoPath) setExistingPhotoPath(finalPhotoPath);
    if (finalPhotoPath && !photoPreview) {
      const { data: signedData } = await supabase.storage.from('mood-photos').createSignedUrl(finalPhotoPath, 3600);
      if (signedData?.signedUrl) setPhotoPreview(signedData.signedUrl);
    }
  };

  const handleEditEntry = () => { setIsEditing(true); setSubmitted(false); setRating(submittedRating); };

  const handleShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsSharing(false); return; }
        const file = new File([blob], `Roz-mood-${getLocalDateString()}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Daily Mood", text: `I'm feeling ${submittedRating}/10 today! ✨` });
        } else {
          const link = document.createElement('a'); link.href = canvas.toDataURL(); link.download = `Roz-${getLocalDateString()}.png`; link.click();
          toast({ title: "Image saved! 📸" });
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (error) { setIsSharing(false); toast({ variant: "destructive", title: "Share failed" }); }
  };

  const MoodIcon = getMoodIcon(submitted ? submittedRating : rating, false);
  const HeartIcon = Heart;
  const showLockedState = !timeWindow.isOpen && !submitted;

  // Handle section change
  const handleSectionChange = (section: TodaySection) => {
    if (section === "journal" && !isJournalUnlocked) {
      // Need to verify or setup PIN
      if (journalPin.hasPin) {
        setPinModalMode("verify");
      } else {
        setPinModalMode("setup");
      }
      setShowPinModal(true);
    } else {
      setActiveSection(section);
    }
  };

  // Handle PIN success
  const handlePinSuccess = () => {
    setIsJournalUnlocked(true);
    setActiveSection("journal");
  };

  // Handle journal save
  const handleJournalSave = async (content: string, newPhotos: File[], existingPhotoPaths: string[]) => {
    return journalEntry.saveEntry(content, newPhotos, existingPhotoPaths);
  };

  // Handle journal cancel - go back to post view
  const handleJournalCancel = () => {
    setActiveSection("post");
  };

  // Handle entering the room when window opens
  const handleEnterRoom = () => {
    const today = getLocalDateString();
    localStorage.setItem(`roz-room-entered-${today}`, "true");
    setHasEnteredRoom(true);
  };

  if (showLockedState) {
    // Use new Zine aesthetic for default dark theme
    if (true) {
      return (
        <>
          <ZineLockedView
            displayName={displayName}
            yesterdaysMood={yesterdaysMood && showYesterdaySummary ? yesterdaysMood : null}
            onYesterdayClick={() => setShowYesterdayEngagement(true)}
            onOpenFitCheckCamera={() => setShowFitCheckCamera(true)}
          />
          {/* Yesterday's engagement sheet */}
{yesterdaysMood && (
  <MoodEngagementSheet
    isOpen={showYesterdayEngagement}
    onClose={() => setShowYesterdayEngagement(false)}
    moodId={yesterdaysMood.id}
    rating={yesterdaysMood.rating}     // <--- FIXED
    moodOwnerId={user?.id || ''}       // <--- ADDED for safety
  />
)}
        </>
      );
    }

    // Pixel theme fallback - original locked state
    const YesterdayMoodIcon = yesterdaysMood ? getMoodIcon(yesterdaysMood.rating, false) : null;
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 py-8 pb-32">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-24 h-24 flex items-center justify-center mb-6 bg-secondary rounded-full`}>
            <Lock className="w-10 h-10 text-muted-foreground" />
          </motion.div>
          <h2 className={`font-bold mb-2 flex items-center gap-2 text-xl`}>{displayName ? `Hi ${displayName}! ✨` : "Hey there! ✨"}</h2>
          {currentStreak > 0 && (<Badge variant="secondary" className="mb-4 bg-orange-50 text-orange-600 border-orange-100 gap-1.5 px-3 py-1"><Flame className="w-3 h-3 fill-orange-500" /><span className="font-bold">{currentStreak} Day Streak</span></Badge>)}
          <p className={`text-muted-foreground mb-6 `}>Your journal opens at 9 PM so you can reflect on your whole day.</p>
          <AnimatePresence>
            {yesterdaysMood && showYesterdaySummary && YesterdayMoodIcon && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`w-full max-w-sm mx-auto mb-6 bg-card border border-border overflow-hidden rounded-2xl shadow-sm`}>
                <div className="p-4 flex items-center justify-between border-b border-border/50">
                  <span className={`text-muted-foreground font-medium text-xs`}>Yesterday's Mood</span>
                  <button onClick={dismissYesterdaySummary} className="p-1 hover:bg-secondary rounded-full transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div
                  onClick={() => setShowYesterdayEngagement(true)}
                  className="cursor-pointer hover:bg-secondary/20 transition-colors"
                >
                  {yesterdaysMood.photo_url ? (
                    <div className="relative w-full aspect-square bg-secondary/30">
                      <img src={yesterdaysMood.photo_url} alt="Yesterday's mood" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-48 flex items-center justify-center bg-secondary/30"><svg class="w-10 h-10 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></div>'; }} />
                    </div>
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-secondary/30"><YesterdayMoodIcon className="w-10 h-10 text-primary-foreground" /></div>
                  )}
                  <div className="p-4">
                    <p className={`text-foreground/90 mb-3 text-sm`}>{getMoodLabel(yesterdaysMood.rating)} ({yesterdaysMood.rating}/10)</p>
                    {yesterdaysMood.caption && (
                      <p className={`text-muted-foreground italic mb-3 text-xs`}>"{yesterdaysMood.caption}"</p>
                    )}
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span className="text-xs">{yesterdaysMood.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{yesterdaysMood.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <CountdownTimer />

          {/* Fit Check Challenge */}
          <div className="w-full mt-6">
            <FitCheckChallenge
              onOpenCamera={() => setShowFitCheckCamera(true)}
            />
          </div>
        </motion.div>
        {/* Yesterday's engagement sheet */}
{yesterdaysMood && (
  <MoodEngagementSheet
    isOpen={showYesterdayEngagement}
    onClose={() => setShowYesterdayEngagement(false)}
    moodId={yesterdaysMood.id}
    moodOwnerId={user?.id || ''}
    photoUrl={yesterdaysMood.photo_url}
    caption={yesterdaysMood.caption}
    rating={yesterdaysMood.rating}     // <--- FIXED
  />
)}
      </div>
    );
  }

  // Show ZineOpenView when window just opened but user hasn't entered yet
  if (timeWindow.isOpen && !submitted && !hasEnteredRoom) {
    return (
      <ZineOpenView onEnter={handleEnterRoom} />
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-8 pb-32">
      {/* Navigation between Post and Journal - only show when window is open */}
      {timeWindow.isOpen && (
        <div className="w-full max-w-sm mb-4">
          <TodayTabNav
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isJournalLocked={!isJournalUnlocked}
          />
        </div>
      )}

      {/* PIN Entry Modal */}
      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        mode={pinModalMode}
        verifyPin={journalPin.verifyPin}
        setupPin={journalPin.setupPin}
      />

      {/* Journal Section */}
      {activeSection === "journal" && isJournalUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full`}>
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className={`font-bold text-lg`}>Private Journal</h2>
              <p className={`text-muted-foreground text-xs`}>
                {journalEntry.entry ? "Edit your entry" : "Write about your day"}
              </p>
            </div>
          </div>
          <JournalEditor
            existingEntry={journalEntry.entry}
            existingPhotoUrls={journalEntry.signedPhotoUrls}
            onSave={handleJournalSave}
            onDelete={journalEntry.entry ? journalEntry.deleteEntry : undefined}
            onCancel={handleJournalCancel}
            canEdit={journalEntry.canEdit}
          />
        </motion.div>
      )}

      {/* Mood Post Section */}
      {activeSection === "post" && (
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm flex flex-col items-center">
            <div className="flex flex-col items-center mb-2">
              <motion.h1 className={`text-2xl md:text-3xl font-bold text-center `}>{displayName ? `Hey ${displayName}! ✨` : "Hey there! ✨"}</motion.h1>
              {currentStreak > 0 && (<Badge variant="secondary" className="mt-2 bg-orange-50 text-orange-600 border-orange-100 gap-1.5 px-3 py-1"><Flame className="w-3 h-3 fill-orange-500" /><span className="font-bold">{currentStreak} Day Streak</span></Badge>)}
            </div>
            <motion.div className="relative mb-6" animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <motion.div className={`w-28 h-28 flex items-center justify-center rounded-full`} style={{ backgroundColor: getMoodColor(rating) }}><MoodIcon className="w-12 h-12 text-primary-foreground" /></motion.div>
              <motion.span key={rating} className={`absolute -bottom-2 -right-2 w-10 h-10 bg-card border-2 border-border flex items-center justify-center text-xl font-bold rounded-full`} style={{ borderRadius: "9999px" }}>{rating}</motion.span>
            </motion.div>
            <Slider value={[rating]} onValueChange={(value) => setRating(value[0])} min={1} max={10} step={1} className="w-full touch-manipulation mb-6" />
            <motion.div className="w-full mb-6">
              {!photoPreview ? (
                <button onClick={handleAddPhotoClick} className={`w-full py-4 border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors rounded-xl`}><Camera className="w-5 h-5" /><span className="font-semibold">Add Photo or Video</span></button>
              ) : (
                <div className="relative">
                  {isVideoMedia ? (
                    <video src={photoPreview} className="w-full h-40 object-cover rounded-xl" autoPlay loop muted playsInline />
                  ) : (
                    <img src={photoPreview} alt="Selected" className="w-full h-40 object-cover rounded-xl" />
                  )}
                  <button onClick={removePhoto} className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"><X className="w-4 h-4" /></button>
                  {isVideoMedia && <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">Video</span>}
                </div>
              )}
            </motion.div>
            <Input type="text" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} className={`mb-2 `} />

            {/* Routine Tags */}
            <div className="w-full mb-4">
              <RoutineTags
                moodId={todaysMoodId}
                pendingTags={pendingTags}
                onTagsChange={setPendingTags}
              />
            </div>

            {/* Visibility Selector */}
            <div className="w-full mb-4">
              <p className={`text-sm text-muted-foreground mb-2 `}>Share with:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("friends")}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border transition-colors ${
                    visibility === "friends"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  } rounded-xl`}
                                  >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">All Friends</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("close_friends")}
                  className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border transition-colors ${
                    visibility === "close_friends"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-secondary"
                  } rounded-xl`}
                                  >
                  <Star className="w-4 h-4" />
                  <span className="font-medium">Close Friends</span>
                </button>
              </div>
            </div>

            <motion.button onClick={handleSubmit} disabled={isUploading} className={`w-full py-4 bg-primary text-primary-foreground font-semibold touch-manipulation disabled:opacity-50 text-lg rounded-2xl`}>{isUploading ? "Saving..." : "Save My Mood ✨"}</motion.button>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center text-center">
            <div ref={shareRef} className={`w-full flex flex-col items-center bg-card p-6 mb-4 rounded-3xl`}>
               <motion.div className={`w-32 h-32 flex items-center justify-center mb-6 rounded-full`} style={{ backgroundColor: getMoodColor(submittedRating) }}><MoodIcon className="w-14 h-14 text-primary-foreground" /></motion.div>
               <h2 className="text-2xl font-bold mb-2">{submittedRating >= 7 ? "Beautiful day! 🌈" : "Sending sunshine! 🌤️"}</h2>
               <p className="text-4xl font-bold mb-6" style={{ color: getMoodColor(submittedRating) }}>{submittedRating}/10</p>
               {photoPreview && (
                 <img
                   src={photoPreview}
                   alt="Mood"
                   onClick={() => setShowEngagementSheet(true)}
                   className={`w-full aspect-square object-cover mb-4 cursor-pointer hover:opacity-90 transition-opacity rounded-xl`}
                 />
               )}
               <p className="text-sm italic">"{caption}"</p>
            </div>
            
            {/* 🔥 FACEPILE */}
            {visibility !== "private" && todaysMoodId && (
              <div 
                onClick={() => setShowEngagementSheet(true)}
                className={`w-full bg-secondary p-4 mb-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform rounded-2xl`} 
                              >
                <div className="flex items-center gap-3">
                  {recentLikers.length > 0 ? (
                    <div className="flex -space-x-2">
                      {recentLikers.map((liker) => (
                        <div key={liker.user_id} className={`w-6 h-6 border-2 border-background overflow-hidden rounded-full`}>
                          {liker.profiles?.avatar_url ? (
                            <img src={liker.profiles.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>'; }} />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center"><User className="w-3 h-3" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  )}
                  
                  <div className="text-left">
                    <p className={`font-semibold text-sm`}>
                      {likesCount > 0 ? `${likesCount} Likes` : "No likes yet"}
                    </p>
                    {recentLikers.length > 0 && (
                      <p className={`text-muted-foreground truncate max-w-[150px] text-xs`}>
                        Liked by <span className="text-foreground">{recentLikers[0].profiles?.username}</span> {likesCount > 1 ? `and ${likesCount - 1} others` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{commentsCount}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 w-full">
               <motion.button onClick={handleShare} disabled={isSharing} className={`flex-1 px-4 py-3 bg-foreground text-background font-medium rounded-xl`}>{isSharing ? "..." : <Share2 className="w-4 h-4 mx-auto" />}</motion.button>
               {timeWindow.isOpen && <motion.button onClick={handleEditEntry} className={`px-4 py-3 bg-secondary text-foreground font-medium rounded-xl`}><Pencil className="w-4 h-4" /></motion.button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* Engagement Sheet for Today's Mood */}
      {todaysMoodId && (
        <MoodEngagementSheet
          isOpen={showEngagementSheet}
          onClose={() => setShowEngagementSheet(false)}
          moodId={todaysMoodId}
          moodOwnerId={user?.id || ''}
          photoUrl={photoPreview}
          caption={caption}
          rating={submittedRating}
        />
      )}

      {/* Engagement Sheet for Yesterday's Mood */}
      {yesterdaysMood && (
        <MoodEngagementSheet
          isOpen={showYesterdayEngagement}
          onClose={() => setShowYesterdayEngagement(false)}
          moodId={yesterdaysMood.id}
          moodOwnerId={user?.id || ''}
          photoUrl={yesterdaysMood.photo_url}
          caption={yesterdaysMood.caption}
          rating={yesterdaysMood.rating}
        />
      )}

      {/* Photo Options Dialog */}
      <AnimatePresence>
        {showPhotoOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowPhotoOptions(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border-t border-border rounded-t-3xl p-6 pb-10"
            >
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
              <h3 className="font-bold text-lg text-center mb-6">Add Photo or Video</h3>
              <div className="space-y-3">
                <button
                  onClick={() => openPhotoCapture("camera")}
                  className="w-full py-4 bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-3 rounded-xl"
                >
                  <Camera className="w-5 h-5" />
                  Take a Photo
                </button>
                <button
                  onClick={() => openPhotoCapture("gallery")}
                  className="w-full py-4 bg-secondary text-foreground font-semibold flex items-center justify-center gap-3 rounded-xl"
                >
                  <ImagePlus className="w-5 h-5" />
                  Upload from Gallery
                </button>
              </div>
              <button
                onClick={() => setShowPhotoOptions(false)}
                className="w-full py-3 text-muted-foreground text-sm mt-4"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Upload Feature Discovery */}
      <AnimatePresence>
        {showGalleryFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={handleGalleryFeatureDismiss}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 flex items-center justify-center mb-4 rounded-2xl"
                  style={{ backgroundColor: "hsl(340, 75%, 95%)" }}
                >
                  <ImagePlus className="w-10 h-10 text-pink-500" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl mb-4"
                >
                  📸🎬✨
                </motion.p>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-bold text-xl mb-2"
                >
                  Gallery Uploads Are Back!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-sm leading-relaxed mb-6"
                >
                  You can now upload photos AND videos from your gallery! Videos can be up to 5 seconds — longer clips can be trimmed right in the app.
                </motion.p>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleGalleryFeatureDismiss}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl"
                  whileTap={{ scale: 0.98 }}
                >
                  Got it!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood Camera */}
      <MoodCamera
        isOpen={showMoodCamera}
        onClose={() => setShowMoodCamera(false)}
        onCapture={handleCameraCapture}
        initialMode={cameraMode}
      />
    </div>
  );
};

export default TodayTab;