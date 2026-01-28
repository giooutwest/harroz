import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User } from "lucide-react";

interface ZineConversationCardProps {
  friendName: string;
  friendAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isSender: boolean;
  index: number;
  onClick: () => void;
}

const ZineConversationCard = ({
  friendName,
  friendAvatar,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isSender,
  index,
  onClick,
}: ZineConversationCardProps) => {
  // Alternate card styles for visual variety
  const cardStyles = [
    { bg: "bg-[#e8e4de]", text: "text-black", border: "border-black/10" },
    { bg: "bg-[#f5f0e8]", text: "text-black", border: "border-black/10" },
    { bg: "bg-[#2a2a2a]", text: "text-white", border: "border-white/10" },
    { bg: "bg-[#f5f0e8]", text: "text-black", border: "border-black/10" },
  ];

  const style = cardStyles[index % cardStyles.length];

  // Slightly different rotations and overlaps
  const rotation = index % 2 === 0 ? -1 : 1;
  const offsetY = -8 * index;

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`relative w-full text-left transition-transform hover:scale-[1.02] active:scale-[0.98]`}
      style={{
        marginTop: index === 0 ? 0 : "-12px",
        zIndex: 10 - index,
      }}
    >
      {/* Torn paper edge effect using clip-path */}
      <div
        className={`relative ${style.bg} ${style.border} border px-4 py-4 shadow-md`}
        style={{
          transform: `rotate(${rotation}deg)`,
          clipPath: index % 2 === 0
            ? "polygon(0% 0%, 100% 0%, 100% 85%, 98% 88%, 95% 85%, 92% 90%, 88% 85%, 85% 88%, 80% 85%, 75% 90%, 70% 85%, 65% 88%, 60% 85%, 55% 90%, 50% 85%, 45% 88%, 40% 85%, 35% 90%, 30% 85%, 25% 88%, 20% 85%, 15% 90%, 10% 85%, 5% 88%, 0% 85%)"
            : "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="w-12 h-12 border-2 border-black/20">
            <AvatarImage src={friendAvatar || undefined} />
            <AvatarFallback className="bg-black text-white">
              {friendName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`font-bold text-lg uppercase tracking-wide ${style.text}`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {friendName}
              </h3>

              {/* NEW badge */}
              {unreadCount > 0 && (
                <span
                  className="px-2 py-0.5 text-[8px] uppercase tracking-wider border border-red-600 text-red-600 bg-transparent"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  New
                </span>
              )}
            </div>

            {/* Last message preview */}
            <p
              className={`text-sm ${style.text} opacity-70 truncate mt-1 italic`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {isSender ? `"You: ${lastMessage}"` : `"${lastMessage}"`}
            </p>

            {/* Time */}
            <p
              className={`text-[10px] ${style.text} opacity-40 uppercase tracking-wider mt-1`}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {lastMessageTime}
            </p>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

export default ZineConversationCard;
