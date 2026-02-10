import { useThemeContext } from "@/contexts/ThemeContext";

export interface ThemeContent {
  // Navigation
  tabTodayLabel: string;
  tabCalendarLabel: string;
  tabFriendsLabel: string;
  tabMessagesLabel: string;
  tabProfileLabel: string;

  // Today tab
  greetingTemplate: (name: string | null) => string;
  promptPlaceholder: string;
  lockedMessage: string;
  submitLabel: string;
  editingSubmitLabel: string;

  // Friends
  friendsTitle: string;
  addFriendLabel: string;
  closeFriendsLabel: string;

  // Calendar
  calendarTitle: (month: string) => string;

  // Settings
  settingsTitle: string;

  // Profile
  profileTitle: string;
}

const studioContent: ThemeContent = {
  tabTodayLabel: "Today",
  tabCalendarLabel: "Calendar",
  tabFriendsLabel: "Circle",
  tabMessagesLabel: "Messages",
  tabProfileLabel: "You",

  greetingTemplate: (name) => name ? `How was your day, ${name}?` : "How was your day?",
  promptPlaceholder: "What happened today?",
  lockedMessage: "Your journal opens at 9 PM so you can reflect on your whole day.",
  submitLabel: "Save Entry",
  editingSubmitLabel: "Update Entry",

  friendsTitle: "Your Circle",
  addFriendLabel: "Add Friend",
  closeFriendsLabel: "Close Friends",

  calendarTitle: (month) => month,

  settingsTitle: "Settings",
  profileTitle: "Profile",
};

const zineContent: ThemeContent = {
  tabTodayLabel: "CURRENT",
  tabCalendarLabel: "Calendar",
  tabFriendsLabel: "FRIENDS",
  tabMessagesLabel: "Messages",
  tabProfileLabel: "You",

  greetingTemplate: (name) => name ? `Hey ${name}! ✨` : "Hey there! ✨",
  promptPlaceholder: "Caption (optional)",
  lockedMessage: "Your journal opens at 9 PM so you can reflect on your whole day.",
  submitLabel: "Save My Mood ✨",
  editingSubmitLabel: "Update My Mood ✨",

  friendsTitle: "FRIENDS",
  addFriendLabel: "Add",
  closeFriendsLabel: "Close Friends",

  calendarTitle: (month) => month,

  settingsTitle: "SYS.CONFIG",
  profileTitle: "Profile",
};

export function useThemeContent(): ThemeContent {
  const { persona } = useThemeContext();
  return persona === "zine" ? zineContent : studioContent;
}
