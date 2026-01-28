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
}

type SettingsTab = "settings" | "updates";

const SettingsSheet = ({ isOpen, onClose }: SettingsSheetProps) => {
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

  const privacyOptions = [
    { key: "show_rating_to_friends" as const, label: "Mood rating", icon: Activity },
    { key: "show_photo_to_friends" as const, label: "Photos", icon: Image },
    { key: "show_caption_to_friends" as const, label: "Journal text", icon: MessageSquare },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a1a] border-t border-white/10 p-6 w-full max-w-lg safe-area-bottom"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            {/* SYS.CONFIG Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-2xl font-bold text-white uppercase tracking-wider"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  SYS.CONFIG
                </h3>
                <p
                  className="text-[10px] text-white/40 uppercase tracking-[0.2em]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  System Settings v2.0
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 transition-colors touch-manipulation"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* APPRVD Stamp */}
            <div className="flex justify-center mb-6">
              <div
                className="px-6 py-2 border-2 border-green-500 text-green-500 uppercase tracking-widest text-xs"
                style={{ fontFamily: "'Space Mono', monospace", transform: "rotate(-3deg)" }}
              >
                APPRVD
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex-1 py-2 px-4 font-medium text-sm transition-colors ${
                  activeTab === "settings"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Config
              </button>
              <button
                onClick={() => { setActiveTab("updates"); refreshUnread(); }}
                className={`flex-1 py-2 px-4 font-medium text-sm transition-colors relative ${
                  activeTab === "updates"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                <span className="flex items-center justify-center gap-1">
                  <Bell className="w-4 h-4" />
                  Updates
                  {hasUnread && activeTab !== "updates" && (
                    <span className="w-2 h-2 bg-green-500 absolute top-1 right-1" />
                  )}
                </span>
              </button>
            </div>

            {activeTab === "updates" ? (
              <UpdatesTab />
            ) : (
              <>
                {/* Profile Section */}
                <div className="mb-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <User className="w-3 h-3" /> User_Profile
                  </h4>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale" />
                        ) : (
                          <User className="w-8 h-8 text-white/40" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute -bottom-1 -right-1 p-2 bg-white text-black"
                      >
                        {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/40 text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                        Tap camera to change avatar
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label
                      className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block flex items-center gap-1"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      <AtSign className="w-3 h-3" /> Username
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        maxLength={20}
                        className={`flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 ${usernameError ? "border-red-500" : ""}`}
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      />
                      <Button
                        onClick={handleSaveUsername}
                        disabled={!hasUsernameChanged || isSavingUsername || isCheckingUsername || !!usernameError || !username.trim()}
                        size="sm"
                        className="bg-white text-black hover:bg-white/80"
                      >
                        {isSavingUsername || isCheckingUsername ? "..." : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                    {usernameError && (
                      <p className="text-red-500 mt-1 text-xs" style={{ fontFamily: "'Space Mono', monospace" }}>
                        {usernameError}
                      </p>
                    )}
                  </div>

                  <label
                    className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    Display_name
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                      className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={!hasNameChanged || isSaving || !displayName.trim()}
                      size="sm"
                      className="bg-white text-black hover:bg-white/80"
                    >
                      {isSaving ? "..." : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Discoverability Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <Search className="w-3 h-3" /> Discoverability
                  </h4>
                  <div className="space-y-2">
                    {[
                      { value: "everyone" as const, label: "EVERYONE", description: "Anyone can search for you" },
                      { value: "friends_of_friends" as const, label: "MUTUAL_ONLY", description: "Only mutual connections" },
                      { value: "nobody" as const, label: "HIDDEN", description: "Only existing friends can see you" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={async () => { setDiscoverableBy(option.value); await supabase.from('profiles').upsert({ user_id: user?.id, discoverable_by: option.value }, { onConflict: 'user_id' }); }}
                        className={`w-full flex items-center justify-between p-3 border transition-all ${
                          discoverableBy === option.value
                            ? "border-white bg-white/10"
                            : "border-white/10 bg-transparent hover:border-white/30"
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                            {option.label}
                          </p>
                          <p className="text-white/40 text-xs">{option.description}</p>
                        </div>
                        {discoverableBy === option.value && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <Eye className="w-3 h-3" /> Privacy_Settings
                  </h4>
                  <div className="space-y-3">
                    {privacyOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <div key={option.key} className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-white/40" />
                            <span className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                              {option.label}
                            </span>
                          </div>
                          <Switch checked={privacy[option.key]} onCheckedChange={(checked) => handlePrivacyChange(option.key, checked)} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <BellRing className="w-3 h-3" /> Notifications
                  </h4>
                  {pushNotifications.isSupported ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                          <Bell className="w-4 h-4 text-white/40" />
                          <div>
                            <span className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                              Activity_Alerts
                            </span>
                            <p className="text-white/40 text-xs">Likes, comments, and 9 PM journal</p>
                          </div>
                        </div>
                        <Switch checked={pushNotifications.isSubscribed} onCheckedChange={handleNotificationToggle} />
                      </div>

                      {pushNotifications.isSubscribed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestNotification}
                          disabled={isSendingTest}
                          className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        >
                          {isSendingTest ? "Sending..." : "Send_Test_Notification"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/10 text-center">
                      <BellOff className="w-5 h-5 mx-auto mb-2 text-white/40" />
                      <p className="text-white/40 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                        Notifications not supported
                      </p>
                    </div>
                  )}
                </div>

                {/* Private Journal PIN Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <BookOpen className="w-3 h-3" /> Private_Journal
                  </h4>
                  <div className="p-4 bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                          {journalPin.hasPin ? (
                            <Lock className="w-5 h-5 text-green-500" />
                          ) : (
                            <KeyRound className="w-5 h-5 text-white/40" />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                            {journalPin.hasPin ? "PIN_ACTIVE" : "PIN_INACTIVE"}
                          </p>
                          <p className="text-white/40 text-xs">
                            {journalPin.hasPin ? "Journal is secured" : "Set a PIN to protect"}
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
                        className="bg-transparent border-white/20 text-white hover:bg-white/10"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {journalPin.hasPin ? "Change" : "Set_PIN"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Install App Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <Smartphone className="w-3 h-3" /> Install_App
                  </h4>
                  <button
                    onClick={() => setShowPWATutorial(true)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/20 hover:border-white/40 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                        Add_to_Home_Screen
                      </p>
                      <p className="text-white/40 text-xs">Install ROZ for quick access</p>
                    </div>
                    <Smartphone className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {/* Feedback Section */}
                <div className="mt-6">
                  <h4
                    className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <MessageSquareHeart className="w-3 h-3" /> Feedback
                  </h4>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-white text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                        Send_Feedback
                      </p>
                      <p className="text-white/40 text-xs">Help us improve</p>
                    </div>
                    <MessageSquareHeart className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {/* Logout Section */}
                <div className="mt-6">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-red-500 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                        LOGOUT
                      </p>
                      <p className="text-red-500/60 text-xs">Sign out of your account</p>
                    </div>
                    <LogOut className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {imageToCrop && <ImageCropper image={imageToCrop} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />}
      <PWAInstallTutorial isOpen={showPWATutorial} onClose={() => setShowPWATutorial(false)} />
      <FeedbackSheet isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
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
      />
    </AnimatePresence>
  );
};

export default SettingsSheet;