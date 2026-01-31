import { useState, useEffect, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Loader2, Camera } from "lucide-react";
import ZineBottomNav from "@/components/ZineBottomNav";
import TodayTab from "@/components/TodayTab";
import SettingsSheet from "@/components/SettingsSheet";
import Onboarding from "@/components/Onboarding";
import UpdateBanner from "@/components/UpdateBanner";
import InstallPrompt from "@/components/InstallPrompt";
import PWAInstallTutorial from "@/components/PWAInstallTutorial";
import NotificationPrompt from "@/components/NotificationPrompt";
import BetaPrompt from "@/components/BetaPrompt";
import FitCheckCamera from "@/components/FitCheckCamera";
import CameraSelectionModal from "@/components/CameraSelectionModal";
import WhatsNewModal from "@/components/WhatsNewModal";
import DailyReelWhatsNew from "@/components/DailyReelWhatsNew";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadUpdates } from "@/hooks/useUnreadUpdates";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { useTimeWindowStatic } from "@/hooks/useTimeWindowStatic";
import { useFitCheckStatus } from "@/hooks/useFitCheckStatus";

const CalendarTab = lazy(() => import("@/components/CalendarTab"));
const StatsTab = lazy(() => import("@/components/StatsTab"));
const FriendsTab = lazy(() => import("@/components/FriendsTab"));
const MessagesTab = lazy(() => import("@/components/MessagesTab"));

type Tab = "today" | "calendar" | "stats" | "friends" | "messages";

const TabLoader = () => (
  <div className="flex items-center justify-center h-[50vh]">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInstallTutorial, setShowInstallTutorial] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showBetaPrompt, setShowBetaPrompt] = useState(false);
  const [showFitCheck, setShowFitCheck] = useState(false);
  const [showCameraSelection, setShowCameraSelection] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showDailyReelWhatsNew, setShowDailyReelWhatsNew] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  
  const [selectedFriendFromNotification, setSelectedFriendFromNotification] = useState<string | null>(null);
  const [selectedMoodFromNotification, setSelectedMoodFromNotification] = useState<string | null>(null);
  const [selectedCommentFromNotification, setSelectedCommentFromNotification] = useState<string | null>(null);
  const [showRequestsFromNotification, setShowRequestsFromNotification] = useState(false);
  const [openCommentsFromNotification, setOpenCommentsFromNotification] = useState(false);

  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { hasUnread } = useUnreadUpdates();
  const { navigation, clearNavigation } = useNotificationNavigation();
  const moodWindow = useTimeWindowStatic();
  const fitCheckStatus = useFitCheckStatus();

  useRealtimeNotifications();

  // Determine if FAB should show (any posting window is open)
  const showCameraFab = moodWindow.isOpen || fitCheckStatus.isActive;

  const handleCameraSelection = (mode: "mood" | "fitcheck") => {
    setShowCameraSelection(false);
    if (mode === "fitcheck") {
      setShowFitCheck(true);
    } else {
      // For mood photo, ensure we're on Today tab
      // The user can use the built-in photo upload there
      setActiveTab("today");
    }
  };

  const handleFriendProfileClick = (friendId: string) => {
    setActiveTab("friends");
    setSelectedFriendFromNotification(friendId);
    setSelectedMoodFromNotification(null);
    setSelectedCommentFromNotification(null);
    setShowRequestsFromNotification(false);
    setOpenCommentsFromNotification(false);
  };

  useEffect(() => {
    if (navigation.tab === "friends" && navigation.friendId) {
      setActiveTab("friends");
      
      if (navigation.type === "friend_request") {
        setShowRequestsFromNotification(true);
        setSelectedFriendFromNotification(null);
        setSelectedMoodFromNotification(null);
        setSelectedCommentFromNotification(null);
        setOpenCommentsFromNotification(false);
      } else {
        setSelectedFriendFromNotification(navigation.friendId);
        setSelectedMoodFromNotification(navigation.moodId);
        setSelectedCommentFromNotification(navigation.commentId);
        setShowRequestsFromNotification(false);
        
        if (navigation.type === 'comment') {
          setOpenCommentsFromNotification(true);
        } else {
          setOpenCommentsFromNotification(false);
        }
      }
      clearNavigation();
    }
  }, [navigation, clearNavigation]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      const onboardingKey = `moodmemos-onboarded-${user.id}`;
      const hasOnboarded = localStorage.getItem(onboardingKey);
      if (!hasOnboarded) {
        setShowOnboarding(true);
      }
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      const onboardingKey = `moodmemos-onboarded-${user.id}`;
      localStorage.setItem(onboardingKey, "true");
      
      const installPromptKey = `moodmemos-install-prompted-${user.id}`;
      const hasPrompted = localStorage.getItem(installPromptKey);
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      
      if (!hasPrompted && !isInstalled) {
        setTimeout(() => setShowInstallPrompt(true), 500);
        localStorage.setItem(installPromptKey, "true");
      }
    }
    setShowOnboarding(false);
  };

  const handleInstallPromptAction = () => {
    setShowInstallPrompt(false);
    setShowInstallTutorial(true);
  };

  const handleInstallTutorialClose = () => {
    setShowInstallTutorial(false);
    const notifPromptKey = `moodmemos-notif-prompted-${user?.id}`;
    const hasPromptedNotif = localStorage.getItem(notifPromptKey);
    if (!hasPromptedNotif && user) {
      setTimeout(() => setShowNotificationPrompt(true), 500);
      localStorage.setItem(notifPromptKey, "true");
    }
  };

  const handleNotificationPromptClose = () => {
    setShowNotificationPrompt(false);
    const betaPromptKey = `moodmemos-beta-prompted-${user?.id}`;
    const hasPromptedBeta = localStorage.getItem(betaPromptKey);
    if (!hasPromptedBeta && user) {
      setTimeout(() => setShowBetaPrompt(true), 500);
      localStorage.setItem(betaPromptKey, "true");
    }
  };

  // Handle "Try it out" from WhatsNew modal
  const handleTryFeature = (action: "today" | "stats" | "settings" | "fitcheck") => {
    switch (action) {
      case "today":
        setActiveTab("today");
        break;
      case "stats":
        setActiveTab("stats");
        break;
      case "settings":
        setShowSettings(true);
        break;
      case "fitcheck":
        setShowFitCheck(true);
        break;
    }
  };

  useEffect(() => {
    if (user && !showOnboarding && !showInstallPrompt && !showInstallTutorial && !showNotificationPrompt) {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      
      if (isInstalled && notifPermission !== 'granted') {
        const pwaNotifPromptKey = `moodmemos-pwa-notif-prompted-${user.id}-session`;
        const hasPromptedThisSession = sessionStorage.getItem(pwaNotifPromptKey);
        
        if (!hasPromptedThisSession) {
          const timer = setTimeout(() => {
            setShowNotificationPrompt(true);
            sessionStorage.setItem(pwaNotifPromptKey, "true");
          }, 1500);
           () => clearTimeout(timer);
        }
      }
      
      const notifPromptKey = `moodmemos-notif-prompted-${user.id}`;
      const hasPromptedNotif = localStorage.getItem(notifPromptKey);
      
      if (!hasPromptedNotif && notifPermission !== 'granted') {
        const timer = setTimeout(() => {
          setShowNotificationPrompt(true);
          localStorage.setItem(notifPromptKey, "true");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, showOnboarding, showInstallPrompt, showInstallTutorial, showNotificationPrompt]);

  useEffect(() => {
    if (user && !showOnboarding && !showInstallPrompt && !showInstallTutorial && !showNotificationPrompt) {
      const betaPromptKey = `moodmemos-beta-prompted-${user.id}`;
      const notifPromptKey = `moodmemos-notif-prompted-${user.id}`;
      const hasPromptedBeta = localStorage.getItem(betaPromptKey);
      const hasPromptedNotif = localStorage.getItem(notifPromptKey);
      
      if (!hasPromptedBeta && hasPromptedNotif) {
        const timer = setTimeout(() => {
          setShowBetaPrompt(true);
          localStorage.setItem(betaPromptKey, "true");
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, showOnboarding, showInstallPrompt, showInstallTutorial, showNotificationPrompt]);

  // Show "What's New" modal for version 2.0 features
  useEffect(() => {
    if (user && !showOnboarding) {
      const whatsNewVersion = "2.1"; // Update this when adding new features
      const whatsNewKey = `moodmemos-whatsnew-${whatsNewVersion}-${user.id}`;
      const hasSeen = localStorage.getItem(whatsNewKey);

      if (!hasSeen) {
        // Small delay to let other modals settle
        const timer = setTimeout(() => {
          setShowWhatsNew(true);
          localStorage.setItem(whatsNewKey, "true");
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, showOnboarding]);

  // Show DailyReel feature announcement (separate from main What's New)
  useEffect(() => {
    if (user && !showOnboarding && !showWhatsNew) {
      const dailyReelKey = `moodmemos-dailyreel-v1-${user.id}`;
      const hasSeen = localStorage.getItem(dailyReelKey);

      if (!hasSeen) {
        const timer = setTimeout(() => {
          setShowDailyReelWhatsNew(true);
          localStorage.setItem(dailyReelKey, "true");
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user, showOnboarding, showWhatsNew]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen bg-background text-foreground safe-area-top">
      {hasUnread && <UpdateBanner />}

      <main className="relative pb-32">
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <TodayTab />
            </motion.div>
          )}
          {activeTab === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<TabLoader />}>
                <CalendarTab />
              </Suspense>
            </motion.div>
          )}
          {activeTab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<TabLoader />}>
                <FriendsTab
                  initialSelectedFriendId={selectedFriendFromNotification}
                  initialSelectedMoodId={selectedMoodFromNotification}
                  initialSelectedCommentId={selectedCommentFromNotification}
                  initialShowRequests={showRequestsFromNotification}
                  initialOpenComments={openCommentsFromNotification}
                  onClearInitialFriend={() => {
                    setSelectedFriendFromNotification(null);
                    setSelectedMoodFromNotification(null);
                    setSelectedCommentFromNotification(null);
                    setShowRequestsFromNotification(false);
                    setOpenCommentsFromNotification(false);
                  }}
                />
              </Suspense>
            </motion.div>
          )}
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<TabLoader />}>
                <StatsTab onSettingsClick={() => setShowSettings(true)} />
              </Suspense>
            </motion.div>
          )}
          {activeTab === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense fallback={<TabLoader />}>
                <MessagesTab
                  onFriendClick={handleFriendProfileClick}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Camera FAB - shows on Today tab when a posting window is open */}
      {activeTab === "today" && showCameraFab && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCameraSelection(true)}
          className={`fixed bottom-32 right-6 z-40 w-14 h-14 shadow-lg flex items-center justify-center rounded-full ${
            fitCheckStatus.isActive
              ? "bg-purple-500 text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          <Camera className="w-6 h-6" />
        </motion.button>
      )}

      <ZineBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          if (user) {
            supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', user.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data?.display_name) {
                  setDisplayName(data.display_name);
                }
              });
          }
        }}
      />

      <InstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} onInstall={handleInstallPromptAction} />
      <PWAInstallTutorial isOpen={showInstallTutorial} onClose={handleInstallTutorialClose} />
      <NotificationPrompt isOpen={showNotificationPrompt} onClose={handleNotificationPromptClose} />
      <BetaPrompt isOpen={showBetaPrompt} onClose={() => setShowBetaPrompt(false)} />
      <FitCheckCamera isOpen={showFitCheck} onClose={() => setShowFitCheck(false)} />
      <CameraSelectionModal
        isOpen={showCameraSelection}
        onClose={() => setShowCameraSelection(false)}
        onSelect={handleCameraSelection}
        moodWindowOpen={moodWindow.isOpen}
        fitCheckActive={fitCheckStatus.isActive}
        fitCheckTimeRemaining={fitCheckStatus.timeRemaining}
      />
      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
        onTryFeature={handleTryFeature}
      />
      <DailyReelWhatsNew
        isOpen={showDailyReelWhatsNew}
        onClose={() => setShowDailyReelWhatsNew(false)}
        onTryIt={() => setActiveTab("friends")}
      />
    </div>
  );
};

export default Index;
