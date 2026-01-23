import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUnreadUpdates = () => {
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkUnread();
    }
  }, [user]);

  const checkUnread = async () => {
    if (!user) return;

    // Get user's last read timestamp
    const { data: readData } = await supabase
      .from('user_update_reads')
      .select('last_read_at')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get latest update
    const { data: latestUpdate } = await supabase
      .from('app_updates')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestUpdate) {
      if (!readData) {
        // User has never read updates
        setHasUnread(true);
      } else {
        // Check if there are updates newer than last read
        const lastRead = new Date(readData.last_read_at);
        const latestCreated = new Date(latestUpdate.created_at);
        setHasUnread(latestCreated > lastRead);
      }
    } else {
      setHasUnread(false);
    }
  };

  return { hasUnread, refresh: checkUnread };
};
