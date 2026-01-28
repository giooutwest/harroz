import { Calendar, Smile, Users, User, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
  activeTab: "today" | "calendar" | "stats" | "friends" | "messages";
  onTabChange: (tab: "today" | "calendar" | "stats" | "friends" | "messages") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    {
      id: "today" as const,
      label: "Today",
      icon: Smile
    },
    {
      id: "calendar" as const,
      label: "Calendar",
      icon: Calendar
    },
    {
      id: "friends" as const,
      label: "Friends",
      icon: Users
    },
    {
      id: "messages" as const,
      label: "Messages",
      icon: MessageCircle
    },
    {
      id: "stats" as const,
      label: "You",
      icon: User
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tab-bar border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center py-2 px-4 min-w-[60px] touch-manipulation"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -m-2 bg-secondary rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`relative z-10 transition-colors w-6 h-6 ${
                    isActive ? "text-tab-active" : "text-tab-inactive"
                  }`}
                />
              </motion.div>
              <span
                className={`mt-1 font-medium transition-colors text-xs ${
                  isActive ? "text-tab-active" : "text-tab-inactive"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
