import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface NotificationNavigation {
  friendId: string | null;
  moodId: string | null;
  commentId: string | null;
  tab: "today" | "calendar" | "stats" | "friends" | null;
  type: "like" | "comment" | "friend_request" | null;
}

interface NotificationNavigationContextType {
  navigation: NotificationNavigation;
  navigateToNotification: (type: "like" | "comment" | "friend_request", friendId: string, moodId?: string | null, commentId?: string | null) => void;
  clearNavigation: () => void;
}

const NotificationNavigationContext = createContext<NotificationNavigationContextType | null>(null);

export const NotificationNavigationProvider = ({ children }: { children: ReactNode }) => {
  const [navigation, setNavigation] = useState<NotificationNavigation>({
    friendId: null,
    moodId: null,
    commentId: null,
    tab: null,
    type: null,
  });

  const navigateToNotification = useCallback((type: "like" | "comment" | "friend_request", friendId: string, moodId?: string | null, commentId?: string | null) => {
    setNavigation({
      friendId,
      moodId: moodId || null,
      commentId: commentId || null,
      tab: "friends",
      type,
    });
  }, []);

  const clearNavigation = useCallback(() => {
    setNavigation({ friendId: null, moodId: null, commentId: null, tab: null, type: null });
  }, []);

  return (
    <NotificationNavigationContext.Provider value={{ navigation, navigateToNotification, clearNavigation }}>
      {children}
    </NotificationNavigationContext.Provider>
  );
};

export const useNotificationNavigation = () => {
  const context = useContext(NotificationNavigationContext);
  if (!context) {
    throw new Error("useNotificationNavigation must be used within NotificationNavigationProvider");
  }
  return context;
};
