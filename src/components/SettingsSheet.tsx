import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Moon, Sparkles, Cherry, User, Check, Eye, Image, MessageSquare, Activity, Camera, Loader2, Search, AtSign, Bell, Smartphone, BellRing, BellOff, MessageCircle, MessageSquareHeart, LogOut, BookOpen, Lock, KeyRound } from "lucide-react";
import { PixelStar } from "./PixelIcons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ImageCropper } from "./ImageCropper";
import UpdatesTab from "./UpdatesTab";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import PWAInstallTutorial from "./PWAInstallTutorial";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import FeedbackSheet from "./FeedbackSheet";
import { useNavigate } from "react-router-dom";
import PinEntryModal from "./PinEntryModal";
import { useJournalPin } from "@/hooks/useJournalPin";

type Theme = "dark" | "pixel" | "fruit" | "calligraphy" | "grunge";
type DefaultVisibility = "private" | "friends" | "close_friends";

interface PrivacySettings {
  show_rating_to_friends: boolean;
  show_photo_to_friends: boolean;
  show_caption_to_friends: boolean;
  show_comments_to_friends_only: boolean;
}

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  isPixelTheme?: boolean;
  isFruitTheme?: boolean;
}

type SettingsTab = "settings" | "updates";

const SettingsSheet = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange,
  isPixelTheme = false,
  isFruitTheme = false
}: SettingsSheetProps) => {
  // 1. ALL HOOKS MUST BE DECLARED HERE AT THE TOP (UNCONDITIONALLY)
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [discoverableBy, setDiscoverableBy] = useState<"everyone" | "friends_of_friends" | "nobody">("everyone");
  const [defaultVisibility, setDefaultVisibility] = useState<DefaultVisibility>("friends");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false); // New state for test button
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    show_rating_to_friends: true,
    show_photo_to_friends: true,
    show_caption_to_friends: true,
    show_comments_to_friends_only: false,
  });
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showPWATutorial, setShowPWATutorial] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // These custom hooks must also be unconditional
  const { hasUnread, refresh: refreshUnread } = useUnreadUpdates();
  const pushNotifications = usePushNotifications();
  const journalPin = useJournalPin();
  const [showJournalPinModal, setShowJournalPinModal] = useState(false);
  const [journalPinMode, setJournalPinMode] = useState<"setup" | "change">("setup");

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  // 2. HELPER FUNCTIONS
  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url, discoverable_by, default_visibility, show_rating_to_friends, show_photo_to_friends, show_caption_to_friends, show_comments_to_friends_only')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      if (data.display_name) {
        setDisplayName(data.display_name);
        setOriginalName(data.display_name);
      }
      setUsername(data.username || "");
      setOriginalUsername(data.username || "");
      setAvatarUrl(data.avatar_url || null);
      setDiscoverableBy((data.discoverable_by as "everyone" | "friends_of_friends" | "nobody") || "everyone");
      setDefaultVisibility((data.default_visibility as DefaultVisibility) || "friends");
      setPrivacy({
        show_rating_to_friends: data.show_rating_to_friends ?? true,
        show_photo_to_friends: data.show_photo_to_friends ?? true,
        show_caption_to_friends: data.show_caption_to_friends ?? true,
        show_comments_to_friends_only: data.show_comments_to_friends_only ?? false,
      });
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    setImageToCrop(null);
    setIsUploadingAvatar(true);

    try {
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from('profiles').upsert({ user_id: user.id, avatar_url: newAvatarUrl }, { onConflict: 'user_id' });
      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast({ title: "Avatar updated! 📸" });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropCancel = () => {
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(null);
  };

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, display_name: displayName.trim() }, { onConflict: 'user_id' });
    setIsSaving(false);
    if (error) {
      toast({ title: "Couldn't save name", description: "Please try again", variant: "destructive" });
    } else {
      setOriginalName(displayName.trim());
      toast({ title: "Name saved! ✨" });
    }
  };

  const handlePrivacyChange = async (key: keyof PrivacySettings, value: boolean) => {
    if (!user) return;
    setPrivacy({ ...privacy, [key]: value });
    await supabase.from('profiles').upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' });
  };

  const validateUsername = (value: string) => {
    if (!value) return "";
    if (value.length < 3) return "At least 3 characters";
    if (value.length > 20) return "Max 20 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Letters, numbers, _ only";
    return "";
  };

  const handleUsernameChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanValue);
    setUsernameError(validateUsername(cleanValue));
  };

  const checkUsernameAvailable = async (usernameToCheck: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.from('profiles').select('user_id').eq('username', usernameToCheck).neq('user_id', user.id).maybeSingle();
    return !data;
  };

  const handleSaveUsername = async () => {
    if (!user || !username.trim() || usernameError) return;
    if (username === originalUsername) return;
    
    setIsCheckingUsername(true);
    const isAvailable = await checkUsernameAvailable(username);
    setIsCheckingUsername(false);
    
    if (!isAvailable) {
      setUsernameError("Username already taken");
      return;
    }
    
    setIsSavingUsername(true);
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, username: username.trim() }, { onConflict: 'user_id' });
    setIsSavingUsername(false);
    
    if (error) {
      if (error.code === '23505') setUsernameError("Username already taken");
      else toast({ title: "Couldn't save username", description: "Please try again", variant: "destructive" });
    } else {
      setOriginalUsername(username.trim());
      toast({ title: "Username saved! ✨" });
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      const result = await pushNotifications.subscribeToPush();
      if (result) {
         toast({ title: "Notifications enabled!", description: "You'll now receive updates." });
      }
    } else {
      toast({ title: "To disable notifications", description: "Please click the lock icon in your address bar and Reset Permissions." });
    }
  };
  
  // 🔥 FIXED: More robust test notification handler
  const handleTestNotification = async () => {
    if (!user) return;
    setIsSendingTest(true);
    try {
      await pushNotifications.sendTestNotification();
      toast({ title: "Test sent! 🚀", description: "Check your notification center." });
    } catch (error) {
      console.error("Test failed", error);
      toast({ variant: "destructive", title: "Test failed", description: "Could not send notification." });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate("/auth");
  };

  const hasNameChanged = displayName.trim() !== originalName;
  const hasUsernameChanged = username.trim() !== originalUsername;

  const themes = [
    { id: "dark" as Theme, name: "Dark Mode", description: "Minimal & sleek", icon: Moon, bgColor: "bg-black", iconColor: "text-white" },
    { id: "pixel" as Theme, name: "Pixel Art", description: "Colorful & retro", icon: isPixelTheme ? PixelStar : Sparkles, gradient: "linear-gradient(135deg, hsl(280, 80%, 65%), hsl(180, 80%, 60%))", iconColor: "text-white" },
    { id: "fruit" as Theme, name: "Fruit Fresh", description: "Sweet & pastel", icon: Cherry, gradient: "linear-gradient(135deg, hsl(350, 80%, 80%), hsl(30, 90%, 85%))", iconColor: "text-white" },
    { id: "calligraphy" as Theme, name: "Calligraphy", description: "White, sleek & script", icon: Sparkles, gradient: "linear-gradient(135deg, rgba(255,245,230,1), rgba(255,250,240,1))", bgColor: "bg-white", iconColor: "text-amber-600" },
    { id: "grunge" as Theme, name: "Y2K Grunge", description: "Typewriter & chaos", icon: Sparkles, gradient: "linear-gradient(135deg, hsl(40, 20%, 90%), hsl(0, 75%, 45%))", iconColor: "text-black" }
  ];

  const privacyOptions = [
    { key: "show_rating_to_friends" as const, label: "Mood rating", icon: Activity },
    { key: "show_photo_to_friends" as const, label: "Photos", icon: Image },
    { key: "show_caption_to_friends" as const, label: "Journal text", icon: MessageSquare },
  ];

  const borderRadius = isPixelTheme ? "0" : undefined;

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
            className={`bg-card border-t border-border p-6 w-full max-w-lg safe-area-bottom ${
              isPixelTheme ? "" : "rounded-t-3xl"
            }`}
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-semibold ${isPixelTheme ? "text-xs" : "text-lg"}`}>Settings</h3>
              <button onClick={onClose} className={`p-2 bg-secondary touch-manipulation ${isPixelTheme ? "" : "rounded-full"}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex-1 py-2 px-4 font-medium transition-colors ${
                  activeTab === "settings" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                } ${isPixelTheme ? "text-xs" : "text-sm rounded-lg"}`}
              >
                Settings
              </button>
              <button
                onClick={() => { setActiveTab("updates"); refreshUnread(); }}
                className={`flex-1 py-2 px-4 font-medium transition-colors relative ${
                  activeTab === "updates" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                } ${isPixelTheme ? "text-xs" : "text-sm rounded-lg"}`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Bell className="w-4 h-4" />
                  Updates
                  {hasUnread && activeTab !== "updates" && (
                    <span className="w-2 h-2 bg-primary rounded-full absolute top-1 right-1" />
                  )}
                </span>
              </button>
            </div>

            {activeTab === "updates" ? (
              <UpdatesTab isPixelTheme={isPixelTheme} />
            ) : (
              <>
                <div className="mb-6">
                  <h4 className={`font-medium mb-4 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
                    <User className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} />
                    Profile
                  </h4>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-20 h-20 bg-secondary flex items-center justify-center overflow-hidden ${isPixelTheme ? "" : "rounded-full"}`} style={{ borderRadius }}>
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground" />}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className={`absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground ${isPixelTheme ? "" : "rounded-full"}`}
                        style={{ borderRadius }}
                      >
                        {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>Tap camera to change avatar</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`text-muted-foreground mb-1 block flex items-center gap-1 ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>
                      <AtSign className="w-3 h-3" /> Username
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type="text"
                          placeholder="username"
                          value={username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          maxLength={20}
                          className={`flex-1 ${isPixelTheme ? "text-xs" : ""} ${usernameError ? "border-destructive" : ""}`}
                          style={{ borderRadius }}
                        />
                      </div>
                      <Button
                        onClick={handleSaveUsername}
                        disabled={!hasUsernameChanged || isSavingUsername || isCheckingUsername || !!usernameError || !username.trim()}
                        size="sm"
                        className={`${isPixelTheme ? "text-[8px] px-2" : ""}`}
                        style={{ borderRadius }}
                      >
                        {isSavingUsername || isCheckingUsername ? "..." : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                    {usernameError && <p className={`text-destructive mt-1 ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>{usernameError}</p>}
                  </div>

                  <label className={`text-muted-foreground mb-1 block ${isPixelTheme ? "text-[8px]" : "text-xs"}`}>Display name</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                      className={`flex-1 ${isPixelTheme ? "text-xs" : ""}`}
                      style={{ borderRadius }}
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={!hasNameChanged || isSaving || !displayName.trim()}
                      size="sm"
                      className={`${isPixelTheme ? "text-[8px] px-2" : ""}`}
                      style={{ borderRadius }}
                    >
                      {isSaving ? "..." : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className={`font-medium mb-3 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>Choose Theme</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {themes.map((theme) => {
                      const Icon = theme.icon;
                      return (
                        <motion.button
                          key={theme.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { onThemeChange(theme.id); onClose(); }}
                          className={`p-4 border-2 transition-all touch-manipulation ${currentTheme === theme.id ? "border-primary bg-secondary" : "border-border bg-card"} ${isPixelTheme ? "" : "rounded-xl"}`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center mb-2 mx-auto ${isPixelTheme ? "" : "rounded-lg"}`} style={{ background: theme.gradient, backgroundColor: theme.bgColor }}>
                            {theme.bgColor ? <div className={`w-full h-full ${theme.bgColor} flex items-center justify-center ${isPixelTheme ? "" : "rounded-lg"}`}><Icon className={`w-5 h-5 ${theme.iconColor}`} /></div> : <Icon className={`w-5 h-5 ${theme.iconColor}`} />}
                          </div>
                          <p className={`font-medium ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>{theme.name}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}><Search className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Who can find you</h4>
                  <div className="space-y-2">
                    {[
                      { value: "everyone" as const, label: "Everyone", description: "Anyone can search for you" },
                      { value: "friends_of_friends" as const, label: "Friends of friends", description: "Only mutual connections" },
                      { value: "nobody" as const, label: "Nobody", description: "Only existing friends can see you" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={async () => { setDiscoverableBy(option.value); await supabase.from('profiles').upsert({ user_id: user?.id, discoverable_by: option.value }, { onConflict: 'user_id' }); }}
                        className={`w-full flex items-center justify-between p-3 border-2 transition-all ${discoverableBy === option.value ? "border-primary bg-secondary" : "border-border bg-card"} ${isPixelTheme ? "" : "rounded-xl"}`}
                        style={{ borderRadius }}
                      >
                        <div className="text-left"><p className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>{option.label}</p><p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>{option.description}</p></div>
                        {discoverableBy === option.value && <Check className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"} text-primary`} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}><Eye className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Friends can see</h4>
                  <div className="space-y-3">
                    {privacyOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <div key={option.key} className={`flex items-center justify-between p-3 bg-secondary ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                          <div className="flex items-center gap-3"><Icon className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} /><span className={`${isPixelTheme ? "text-[8px]" : "text-sm"}`}>{option.label}</span></div>
                          <Switch checked={privacy[option.key]} onCheckedChange={(checked) => handlePrivacyChange(option.key, checked)} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}><BellRing className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Notifications</h4>
                  {pushNotifications.isSupported ? (
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-3 bg-secondary ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                        <div className="flex items-center gap-3"><Bell className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} /><div><span className={`${isPixelTheme ? "text-[8px]" : "text-sm"}`}>Activity & Daily Reminders</span><p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>Get notified about likes, comments, and your 9 PM journal</p></div></div>
                        <Switch checked={pushNotifications.isSubscribed} onCheckedChange={handleNotificationToggle} />
                      </div>
                      
                      {/* 🔥 FIXED BUTTON: Uses the new handleTestNotification function */}
                      {pushNotifications.isSubscribed && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleTestNotification} 
                          disabled={isSendingTest}
                          className={`w-full ${isPixelTheme ? "text-xs" : ""}`} 
                          style={{ borderRadius }}
                        >
                          {isSendingTest ? "Sending..." : "Send test notification"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className={`p-3 bg-secondary text-center ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                      <BellOff className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} mx-auto mb-2 text-muted-foreground`} />
                      <p className={`text-muted-foreground ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>Notifications not supported on this device</p>
                    </div>
                  )}
                </div>

                {/* Private Journal PIN Section */}
                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
                    <BookOpen className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Private Journal
                  </h4>
                  <div className={`p-4 bg-secondary ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-primary/10 flex items-center justify-center ${isPixelTheme ? "" : "rounded-full"}`}>
                          {journalPin.hasPin ? (
                            <Lock className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-primary`} />
                          ) : (
                            <KeyRound className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-muted-foreground`} />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>
                            {journalPin.hasPin ? "PIN Protected" : "No PIN Set"}
                          </p>
                          <p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                            {journalPin.hasPin
                              ? "Your private journal is secured"
                              : "Set a PIN to protect your journal"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setJournalPinMode(journalPin.hasPin ? "change" : "setup");
                          setShowJournalPinModal(true);
                        }}
                        className={`${isPixelTheme ? "text-[8px]" : ""}`}
                        style={{ borderRadius }}
                      >
                        {journalPin.hasPin ? "Change" : "Set PIN"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}><Smartphone className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Install App</h4>
                  <button onClick={() => setShowPWATutorial(true)} className={`w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                    <div className="text-left"><p className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>Add to Home Screen</p><p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>Install Roz for quick access</p></div>
                    <Smartphone className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-primary`} />
                  </button>
                </div>

                <div className="mt-6">
                  <h4 className={`font-medium mb-3 flex items-center gap-2 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}><MessageSquareHeart className={`${isPixelTheme ? "w-3 h-3" : "w-4 h-4"}`} /> Feedback</h4>
                  <button onClick={() => setShowFeedback(true)} className={`w-full flex items-center justify-between p-4 bg-secondary hover:bg-secondary/80 transition-colors ${isPixelTheme ? "" : "rounded-xl"}`} style={{ borderRadius }}>
                    <div className="text-left"><p className={`font-medium ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>Send Feedback</p><p className={`text-muted-foreground ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>Help us improve with your thoughts</p></div>
                    <MessageSquareHeart className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-primary`} />
                  </button>
                </div>

                {/* Red Logout Button */}
                <div className="mt-6">
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/20 transition-colors ${isPixelTheme ? "" : "rounded-xl"}`}
                    style={{ borderRadius }}
                  >
                    <div className="text-left">
                      <p className={`font-medium text-red-500 ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>Log Out</p>
                      <p className={`text-red-500/60 ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>Sign out of your account</p>
                    </div>
                    <LogOut className={`${isPixelTheme ? "w-4 h-4" : "w-5 h-5"} text-red-500`} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {imageToCrop && <ImageCropper image={imageToCrop} onCropComplete={handleCropComplete} onCancel={handleCropCancel} isPixelTheme={isPixelTheme} />}
      <PWAInstallTutorial isOpen={showPWATutorial} onClose={() => setShowPWATutorial(false)} isPixelTheme={isPixelTheme} />
      <FeedbackSheet isOpen={showFeedback} onClose={() => setShowFeedback(false)} isPixelTheme={isPixelTheme} />
      <PinEntryModal
        isOpen={showJournalPinModal}
        onClose={() => setShowJournalPinModal(false)}
        onSuccess={() => {
          setShowJournalPinModal(false);
          toast({ title: journalPinMode === "setup" ? "PIN created!" : "PIN changed!" });
        }}
        mode={journalPinMode}
        verifyPin={journalPin.verifyPin}
        setupPin={journalPin.setupPin}
        changePin={journalPin.changePin}
        isPixelTheme={isPixelTheme}
      />
    </AnimatePresence>
  );
};

export default SettingsSheet;