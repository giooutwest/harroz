import { Calendar, Smile, Users, User, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeContent } from "@/hooks/useThemeContent";

interface StudioBottomNavProps {
  activeTab: "today" | "calendar" | "stats" | "friends" | "messages";
  onTabChange: (tab: "today" | "calendar" | "stats" | "friends" | "messages") => void;
}

const StudioBottomNav = ({ activeTab, onTabChange }: StudioBottomNavProps) => {
  const content = useThemeContent();

  const tabs = [
    { id: "today" as const, label: content.tabTodayLabel, icon: Smile },
    { id: "calendar" as const, label: content.tabCalendarLabel, icon: Calendar },
    { id: "friends" as const, label: content.tabFriendsLabel, icon: Users },
    { id: "messages" as const, label: content.tabMessagesLabel, icon: MessageCircle },
    { id: "stats" as const, label: content.tabProfileLabel, icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-3 mb-2 rounded-2xl bg-tab-bar/80 backdrop-blur-xl border border-border/50 shadow-lg">
        <div className="flex items-center justify-around px-2 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] touch-manipulation relative"
              >
                <motion.div
                  animate={{ scale: isActive ? 1 : 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative"
                >
                  {isActive && (
                    <motion.div
                      layoutId="studioActiveTab"
                      className="absolute inset-0 -m-2 bg-secondary/80 rounded-xl"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 transition-colors w-5 h-5 ${
                      isActive ? "text-tab-active" : "text-tab-inactive"
                    }`}
                  />
                </motion.div>
                <span
                  className={`mt-1 transition-colors tracking-tight text-[10px] ${
                    isActive ? "text-tab-active font-semibold" : "text-tab-inactive font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default StudioBottomNav;
