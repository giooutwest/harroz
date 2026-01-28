import { motion } from "framer-motion";
import { Lock, Users, Star } from "lucide-react";

type Visibility = "private" | "friends" | "close_friends";

interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
}

const VisibilitySelector = ({ value, onChange }: VisibilitySelectorProps) => {
  const options = [
    {
      id: "private" as Visibility,
      label: "Private",
      icon: Lock,
      description: "Only you"
    },
    {
      id: "friends" as Visibility,
      label: "Friends",
      icon: Users,
      description: "All friends"
    },
    {
      id: "close_friends" as Visibility,
      label: "Close",
      icon: Star,
      description: "Close friends"
    },
  ];

  return (
    <div className="flex gap-2 w-full">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.id;

        return (
          <motion.button
            key={option.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.id)}
            className={`flex-1 py-2 px-2 flex flex-col items-center gap-1 border-2 transition-all rounded-xl ${
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <Icon className={`w-4 h-4 ${
              isSelected ? "text-primary" : "text-muted-foreground"
            }`} />
            <span className={`font-medium text-xs ${
              isSelected ? "text-primary" : "text-muted-foreground"
            }`}>
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default VisibilitySelector;
