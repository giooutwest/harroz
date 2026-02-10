import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useThemeContent } from "@/hooks/useThemeContent";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, User, Check, Eye, Image, MessageSquare, Activity, Camera, Loader2, Search, AtSign, Bell, Smartphone, BellRing, BellOff, MessageCircle, MessageSquareHeart, LogOut, BookOpen, Lock, KeyRound, Award, Share2, Copy } from "lucide-react";
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
import BadgesSection from "./BadgesSection";
import { useBadges } from "@/hooks/useBadges";

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

type SettingsTab = "settings" | "updates" | "badges";

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
  const { referralCode, applyReferralCode } = useBadges();
  const [showJournalPinModal, setShowJournalPinModal] = useState(false);
  const [journalPinMode, setJournalPinMode] = useState<"setup" | "change">("setup");
  const [referralInput, setReferralInput] = useState("");
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const { theme: currentTheme, setTheme, isStudio } = useTheme();
  const themeCtx = useThemeContext();
  const themeContent = useThemeContent();

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

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: "Copied!", description: "Share this code with friends" });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    setIsApplyingReferral(true);
    const result = await applyReferralCode(referralInput.trim());
    setIsApplyingReferral(false);

    if (result.success) {
      toast({ title: result.message });
      setReferralInput("");
    } else {
      toast({ title: result.message, variant: "destructive" });
    }
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
            className="bg-background border-t border-foreground/10 p-6 w-full max-w-lg safe-area-bottom"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                {isStudio ? (
                  <h3 className="text-2xl font-bold tracking-tight">{themeContent.settingsTitle}</h3>
                ) : (
                  <>
                    <h3
                      className="text-2xl font-bold text-foreground uppercase tracking-wider"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      SYS.CONFIG
                    </h3>
                    <p
                      className="text-[10px] text-foreground/40 uppercase tracking-[0.2em]"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      System Settings v4.0
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className={`p-2 transition-colors touch-manipulation ${isStudio ? 'rounded-xl bg-secondary hover:bg-secondary/80' : 'bg-foreground/10 hover:bg-foreground/20'}`}
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* APPRVD Stamp — Zine only */}
            {!isStudio && (
              <div className="flex justify-center mb-6">
                <div
                  className="px-6 py-2 border-2 border-green-500 text-green-500 uppercase tracking-widest text-xs"
                  style={{ fontFamily: "'Space Mono', monospace", transform: "rotate(-3deg)" }}
                >
                  APPRVD
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              {[
                { key: "settings" as SettingsTab, label: isStudio ? "Settings" : "Config", icon: null },
                { key: "badges" as SettingsTab, label: "Badges", icon: Award },
                { key: "updates" as SettingsTab, label: "Updates", icon: Bell },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); if (tab.key === "updates") refreshUnread(); }}
                  className={`flex-1 py-2 px-3 font-medium text-xs transition-colors relative ${
                    isStudio
                      ? activeTab === tab.key
                        ? "bg-primary text-primary-foreground rounded-xl"
                        : "bg-secondary text-muted-foreground rounded-xl hover:bg-secondary/80"
                      : activeTab === tab.key
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20"
                  }`}
                  style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                >
                  <span className="flex items-center justify-center gap-1">
                    {tab.icon && <tab.icon className="w-3 h-3" />}
                    {tab.label}
                    {tab.key === "updates" && hasUnread && activeTab !== "updates" && (
                      <span className={`w-2 h-2 absolute top-1 right-1 ${isStudio ? 'bg-blue-500 rounded-full' : 'bg-green-500'}`} />
                    )}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === "updates" ? (
              <UpdatesTab />
            ) : activeTab === "badges" ? (
              <BadgesSection />
            ) : (
              <>
                {/* Profile Section */}
                <div className="mb-6">
                  <h4
                    className={`mb-4 flex items-center gap-2 ${
                      isStudio
                        ? 'text-xs font-semibold text-muted-foreground'
                        : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <User className="w-3 h-3" /> {isStudio ? 'Profile' : 'User_Profile'}
                  </h4>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-20 h-20 flex items-center justify-center overflow-hidden ${
                        isStudio
                          ? 'bg-secondary rounded-full ring-2 ring-border'
                          : 'bg-foreground/10 border border-foreground/20'
                      }`}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className={`w-full h-full object-cover ${isStudio ? '' : 'grayscale'}`} />
                        ) : (
                          <User className={`w-8 h-8 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className={`absolute -bottom-1 -right-1 p-2 ${
                          isStudio
                            ? 'bg-primary text-primary-foreground rounded-full'
                            : 'bg-foreground text-background'
                        }`}
                      >
                        {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        Tap camera to change avatar
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label
                      className={`mb-1 block flex items-center gap-1 ${
                        isStudio
                          ? 'text-xs text-muted-foreground'
                          : 'text-[10px] text-foreground/40 uppercase tracking-wider'
                      }`}
                      style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
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
                        className={`flex-1 ${usernameError ? "border-red-500" : ""} ${
                          isStudio
                            ? 'bg-secondary border-border rounded-xl'
                            : 'bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30'
                        }`}
                        style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                      />
                      <Button
                        onClick={handleSaveUsername}
                        disabled={!hasUsernameChanged || isSavingUsername || isCheckingUsername || !!usernameError || !username.trim()}
                        size="sm"
                        className={isStudio ? 'rounded-xl' : 'bg-foreground text-background hover:bg-foreground/80'}
                      >
                        {isSavingUsername || isCheckingUsername ? "..." : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                    {usernameError && (
                      <p className="text-red-500 mt-1 text-xs" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        {usernameError}
                      </p>
                    )}
                  </div>

                  <label
                    className={`mb-1 block ${
                      isStudio
                        ? 'text-xs text-muted-foreground'
                        : 'text-[10px] text-foreground/40 uppercase tracking-wider'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    {isStudio ? 'Display Name' : 'Display_name'}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                      className={`flex-1 ${
                        isStudio
                          ? 'bg-secondary border-border rounded-xl'
                          : 'bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30'
                      }`}
                      style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={!hasNameChanged || isSaving || !displayName.trim()}
                      size="sm"
                      className={isStudio ? 'rounded-xl' : 'bg-foreground text-background hover:bg-foreground/80'}
                    >
                      {isSaving ? "..." : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Discoverability Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <Search className="w-3 h-3" /> {isStudio ? 'Discoverability' : 'Discoverability'}
                  </h4>
                  <div className="space-y-2">
                    {[
                      { value: "everyone" as const, label: isStudio ? "Everyone" : "EVERYONE", description: "Anyone can search for you" },
                      { value: "friends_of_friends" as const, label: isStudio ? "Mutual Only" : "MUTUAL_ONLY", description: "Only mutual connections" },
                      { value: "nobody" as const, label: isStudio ? "Hidden" : "HIDDEN", description: "Only existing friends can see you" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={async () => { setDiscoverableBy(option.value); await supabase.from('profiles').upsert({ user_id: user?.id, discoverable_by: option.value }, { onConflict: 'user_id' }); }}
                        className={`w-full flex items-center justify-between p-3 border transition-all ${
                          isStudio
                            ? discoverableBy === option.value
                              ? 'border-primary bg-primary/5 rounded-xl'
                              : 'border-border bg-secondary/50 rounded-xl hover:bg-secondary'
                            : discoverableBy === option.value
                              ? 'border-foreground bg-foreground/10'
                              : 'border-foreground/10 bg-transparent hover:border-foreground/30'
                        }`}
                      >
                        <div className="text-left">
                          <p className={`text-sm ${isStudio ? 'text-foreground font-medium' : 'text-foreground'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                            {option.label}
                          </p>
                          <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`}>{option.description}</p>
                        </div>
                        {discoverableBy === option.value && <Check className={`w-4 h-4 ${isStudio ? 'text-primary' : 'text-foreground'}`} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <Eye className="w-3 h-3" /> {isStudio ? 'Privacy' : 'Privacy_Settings'}
                  </h4>
                  <div className="space-y-3">
                    {privacyOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <div key={option.key} className={`flex items-center justify-between p-3 ${
                          isStudio
                            ? 'bg-secondary/50 border border-border rounded-xl'
                            : 'bg-foreground/5 border border-foreground/10'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} />
                            <span className={`text-sm ${isStudio ? 'text-foreground' : 'text-foreground'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
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
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <BellRing className="w-3 h-3" /> Notifications
                  </h4>
                  {pushNotifications.isSupported ? (
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-3 ${
                        isStudio ? 'bg-secondary/50 border border-border rounded-xl' : 'bg-foreground/5 border border-foreground/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Bell className={`w-4 h-4 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} />
                          <div>
                            <span className="text-foreground text-sm" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                              {isStudio ? 'Activity Alerts' : 'Activity_Alerts'}
                            </span>
                            <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`}>Likes, comments, and 9 PM journal</p>
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
                          className={`w-full ${
                            isStudio
                              ? 'rounded-xl'
                              : 'bg-transparent border-foreground/20 text-foreground hover:bg-foreground/10'
                          }`}
                          style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                        >
                          {isSendingTest ? "Sending..." : isStudio ? "Send Test Notification" : "Send_Test_Notification"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className={`p-3 text-center ${
                      isStudio ? 'bg-secondary/50 border border-border rounded-xl' : 'bg-foreground/5 border border-foreground/10'
                    }`}>
                      <BellOff className={`w-5 h-5 mx-auto mb-2 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} />
                      <p className={`text-sm ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        Notifications not supported
                      </p>
                    </div>
                  )}
                </div>

                {/* Private Journal PIN Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <BookOpen className="w-3 h-3" /> {isStudio ? 'Private Journal' : 'Private_Journal'}
                  </h4>
                  <div className={`p-4 ${
                    isStudio ? 'bg-secondary/50 border border-border rounded-xl' : 'bg-foreground/5 border border-foreground/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center ${
                          isStudio ? 'bg-secondary rounded-lg' : 'bg-foreground/10'
                        }`}>
                          {journalPin.hasPin ? (
                            <Lock className="w-5 h-5 text-green-500" />
                          ) : (
                            <KeyRound className={`w-5 h-5 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} />
                          )}
                        </div>
                        <div>
                          <p className="text-foreground text-sm" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                            {journalPin.hasPin ? (isStudio ? "PIN Active" : "PIN_ACTIVE") : (isStudio ? "PIN Inactive" : "PIN_INACTIVE")}
                          </p>
                          <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`}>
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
                        className={isStudio ? 'rounded-xl' : 'bg-transparent border-foreground/20 text-foreground hover:bg-foreground/10'}
                        style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                      >
                        {journalPin.hasPin ? "Change" : (isStudio ? "Set PIN" : "Set_PIN")}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Referral Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <Share2 className="w-3 h-3" /> {isStudio ? 'Invite Friends' : 'Invite_Friends'}
                  </h4>
                  <div className={`p-4 mb-3 ${
                    isStudio ? 'bg-secondary/50 border border-border rounded-xl' : 'bg-foreground/5 border border-foreground/10'
                  }`}>
                    <p className={`text-xs mb-2 ${isStudio ? 'text-muted-foreground' : 'text-foreground/60'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                      Your referral code
                    </p>
                    <div className="flex gap-2">
                      <div className={`flex-1 px-3 py-2 flex items-center justify-between ${
                        isStudio ? 'bg-background border border-border rounded-lg' : 'bg-foreground/10 border border-foreground/20'
                      }`}>
                        <span className="text-foreground font-bold tracking-wider" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                          {referralCode || "..."}
                        </span>
                        <button onClick={handleCopyReferral} className={`p-1 ${isStudio ? 'hover:bg-secondary rounded' : 'hover:bg-foreground/10'}`}>
                          <Copy className={`w-4 h-4 ${isStudio ? 'text-muted-foreground' : 'text-foreground/60'}`} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-[10px] mt-2 ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                      Share to unlock Community Champion badge!
                    </p>
                  </div>
                  <div className={`p-4 ${
                    isStudio ? 'bg-secondary/50 border border-border rounded-xl' : 'bg-foreground/5 border border-foreground/10'
                  }`}>
                    <p className={`text-xs mb-2 ${isStudio ? 'text-muted-foreground' : 'text-foreground/60'}`} style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                      Have a friend's code?
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                        maxLength={8}
                        className={`flex-1 uppercase ${
                          isStudio
                            ? 'bg-background border-border rounded-lg'
                            : 'bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30'
                        }`}
                        style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                      />
                      <Button
                        onClick={handleApplyReferral}
                        disabled={!referralInput.trim() || isApplyingReferral}
                        size="sm"
                        className={isStudio ? 'rounded-lg' : 'bg-[#C5A059] text-black hover:bg-[#C5A059]/80'}
                      >
                        {isApplyingReferral ? "..." : "Apply"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Install App Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <Smartphone className="w-3 h-3" /> {isStudio ? 'Install App' : 'Install_App'}
                  </h4>
                  <button
                    onClick={() => setShowPWATutorial(true)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${
                      isStudio
                        ? 'bg-secondary/50 border border-border rounded-xl hover:bg-secondary'
                        : 'bg-foreground/5 border border-foreground/20 hover:border-foreground/40'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-foreground text-sm" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        {isStudio ? 'Add to Home Screen' : 'Add_to_Home_Screen'}
                      </p>
                      <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`}>Install ROZ for quick access</p>
                    </div>
                    <Smartphone className={`w-5 h-5 ${isStudio ? 'text-muted-foreground' : 'text-foreground/60'}`} />
                  </button>
                </div>

                {/* Theme Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <Sparkles className="w-3 h-3" /> Theme
                  </h4>

                  {/* Persona selector: Studio / Zine */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => themeCtx.setPersona('studio')}
                      className={`flex-1 p-4 border transition-colors rounded-xl ${
                        themeCtx.persona === 'studio'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <div className="w-full h-12 rounded-lg bg-white border border-black/10 mb-2 flex items-center justify-center">
                        <span className="text-black text-[10px] font-medium">Aa</span>
                      </div>
                      <p className={`text-xs font-medium ${themeCtx.persona === 'studio' ? 'text-foreground' : 'text-muted-foreground'}`}>Studio</p>
                    </button>
                    <button
                      onClick={() => themeCtx.setPersona('zine')}
                      className={`flex-1 p-4 border transition-colors rounded-xl ${
                        themeCtx.persona === 'zine'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <div className="w-full h-12 rounded-lg bg-black border border-white/10 mb-2 flex items-center justify-center">
                        <span className="text-white text-[10px]" style={{ fontFamily: "'Space Mono', monospace" }}>Aa</span>
                      </div>
                      <p className={`text-xs font-medium ${themeCtx.persona === 'zine' ? 'text-foreground' : 'text-muted-foreground'}`}>Zine</p>
                    </button>
                  </div>

                  {/* Color mode sub-option (Studio only) */}
                  {isStudio && (
                    <div className="flex gap-2">
                      {([
                        { mode: "light" as const, label: "Light" },
                        { mode: "dark" as const, label: "Dark" },
                        { mode: "system" as const, label: "System" },
                      ]).map((opt) => (
                        <button
                          key={opt.mode}
                          onClick={() => themeCtx.setColorMode(opt.mode)}
                          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
                            themeCtx.colorMode === opt.mode
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feedback Section */}
                <div className="mt-6">
                  <h4
                    className={`mb-3 flex items-center gap-2 ${
                      isStudio ? 'text-xs font-semibold text-muted-foreground' : 'text-[10px] text-foreground/40 uppercase tracking-[0.2em]'
                    }`}
                    style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}
                  >
                    <MessageSquareHeart className="w-3 h-3" /> Feedback
                  </h4>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${
                      isStudio
                        ? 'bg-secondary/50 border border-border rounded-xl hover:bg-secondary'
                        : 'bg-foreground/5 border border-foreground/10 hover:border-foreground/30'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-foreground text-sm" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        {isStudio ? 'Send Feedback' : 'Send_Feedback'}
                      </p>
                      <p className={`text-xs ${isStudio ? 'text-muted-foreground' : 'text-foreground/40'}`}>Help us improve</p>
                    </div>
                    <MessageSquareHeart className={`w-5 h-5 ${isStudio ? 'text-muted-foreground' : 'text-foreground/60'}`} />
                  </button>
                </div>

                {/* Logout Section */}
                <div className="mt-6">
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors ${
                      isStudio ? 'rounded-xl' : ''
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-red-500 text-sm" style={isStudio ? undefined : { fontFamily: "'Space Mono', monospace" }}>
                        {isStudio ? 'Log Out' : 'LOGOUT'}
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