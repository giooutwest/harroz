import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { APP_VERSION } from "@/lib/appVersion"; // <--- Import source of truth

interface Update {
  id: string;
  title: string;
  description: string;
  version: string | null;
  created_at: string;
}

interface UpdatesTabProps {
  isPixelTheme?: boolean;
}

const UpdatesTab = ({ isPixelTheme = false }: UpdatesTabProps) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUpdates();
    markAsRead();
  }, [user]);

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from('app_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setUpdates(data);
    }
    setLoading(false);
  };

  const markAsRead = async () => {
    if (!user) return;

    await supabase
      .from('user_update_reads')
      .upsert(
        { user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Version Display */}
      <div className={`flex items-center justify-center p-3 mb-4 bg-primary/5 border border-primary/20 ${
        isPixelTheme ? "" : "rounded-xl"
      }`}>
        <Tag className="w-4 h-4 mr-2 text-primary" />
        <span className={`font-medium ${isPixelTheme ? "text-xs" : "text-sm"}`}>
          Current Version: <span className="font-bold text-primary">v{APP_VERSION}</span>
        </span>
      </div>

      {updates.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className={`text-muted-foreground ${isPixelTheme ? "text-xs" : "text-sm"}`}>
            No updates yet. Check back soon!
          </p>
        </div>
      ) : (
        updates.map((update, index) => (
          <motion.div
            key={update.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 bg-secondary border border-border ${
              isPixelTheme ? "" : "rounded-xl"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 bg-primary/20 ${isPixelTheme ? "" : "rounded-lg"}`}>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${isPixelTheme ? "text-xs" : "text-sm"}`}>
                    {update.title}
                  </h4>
                  {update.version && (
                    <span className={`px-2 py-0.5 bg-primary/10 text-primary ${
                      isPixelTheme ? "text-[6px]" : "text-xs rounded-full"
                    }`}>
                      v{update.version}
                    </span>
                  )}
                </div>
                <p className={`text-muted-foreground mb-2 ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>
                  {update.description}
                </p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className={`${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                    {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default UpdatesTab;
