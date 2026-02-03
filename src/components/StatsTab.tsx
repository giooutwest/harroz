import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sun, TrendingUp, PieChart, Sparkles, Camera, Edit2, Save, X, User, Clock, Activity, Settings } from "lucide-react";
import OnThisDay from "./OnThisDay";
import TagActivityChart from "./TagActivityChart";
import { supabase } from "@/integrations/supabase/client";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from "recharts";
import { PixelFlame, PixelStar, PixelChart } from "./PixelIcons";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import ZineProfileView from "./ZineProfileView";

interface Stats {
  bestStreak: number;
  currentStreak: number;
  totalGoodDays: number;
  totalEntries: number;
  yearlyAverage: number;
  moodDistribution: { name: string; value: number; color: string }[];
}

interface UserProfile {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface StatsTabProps {
  onSettingsClick?: () => void;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const StatsTab = ({ onSettingsClick }: StatsTabProps) => {
  const [stats, setStats] = useState<Stats>({
    bestStreak: 0,
    currentStreak: 0,
    totalGoodDays: 0,
    totalEntries: 0,
    yearlyAverage: 0,
    moodDistribution: [],
  });
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>({ 
    display_name: "", username: "", bio: "", avatar_url: "" 
  });
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchProfile()]);
    setLoading(false);
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    // @ts-ignore
    const { data, error } = await supabase
      .from('profiles')
      // @ts-ignore
      .select('display_name, username, bio, avatar_url')
      .eq('user_id', user.id)
      .single();
      
    if (data && !error) {
      // @ts-ignore
      setProfile(data);
      // @ts-ignore
      setEditForm(data);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('moods')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (!data || data.length === 0) {
      return;
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDesc = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let i = 0; i < sortedDesc.length; i++) {
      const entryDate = new Date(sortedDesc[i].date + 'T12:00:00');
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      const entryDateStr = entryDate.toISOString().split('T')[0];
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (entryDateStr === expectedDateStr) {
        currentStreak++;
      } else if (i === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (entryDateStr === yesterdayStr) {
          currentStreak = 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const sortedAsc = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    tempStreak = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prevDate = new Date(sortedAsc[i - 1].date + 'T12:00:00');
      const currDate = new Date(sortedAsc[i].date + 'T12:00:00');
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    const totalGoodDays = data.filter(m => m.rating >= 7).length;
    const sum = data.reduce((acc, m) => acc + m.rating, 0);
    const yearlyAverage = data.length > 0 ? sum / data.length : 0;

    const distribution = {
      "Stormy": 0,
      "Rainy": 0,
      "Cloudy": 0,
      "Partly sunny": 0,
      "Sunny": 0,
    };

    data.forEach(m => {
      if (m.rating <= 2) distribution["Stormy"]++;
      else if (m.rating <= 4) distribution["Rainy"]++;
      else if (m.rating <= 6) distribution["Cloudy"]++;
      else if (m.rating <= 8) distribution["Partly sunny"]++;
      else distribution["Sunny"]++;
    });

    const moodDistribution = [
      { name: "🌧️ Stormy", value: distribution["Stormy"], color: getMoodColor(1) },
      { name: "🌧 Rainy", value: distribution["Rainy"], color: getMoodColor(3) },
      { name: "☁️ Cloudy", value: distribution["Cloudy"], color: getMoodColor(5) },
      { name: "⛅ Partly sunny", value: distribution["Partly sunny"], color: getMoodColor(7) },
      { name: "☀️ Sunny", value: distribution["Sunny"], color: getMoodColor(9) },
    ].filter(d => d.value > 0);

    setStats({
      bestStreak,
      currentStreak,
      totalGoodDays,
      totalEntries: data.length,
      yearlyAverage,
      moodDistribution,
    });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    // @ts-ignore
    const { error } = await supabase
      .from('profiles')
      // @ts-ignore
      .update({
        display_name: editForm.display_name,
        bio: editForm.bio,
        username: editForm.username,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated! ✨" });
      setProfile(editForm);
      setIsEditing(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      setEditForm(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      setProfile(prev => prev ? ({ ...prev, avatar_url: newAvatarUrl }) : null);
      toast({ title: "Avatar updated! 📸" });
      
    } catch (error: any) {
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] bg-[#f5f0e8]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-black border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Zine Profile View - Dossier style */}
      <ZineProfileView
        displayName={profile?.display_name || null}
        username={profile?.username || null}
        avatarUrl={profile?.avatar_url || null}
        currentStreak={stats.currentStreak}
        bestStreak={stats.bestStreak}
        totalGoodDays={stats.totalGoodDays}
        totalEntries={stats.totalEntries}
        yearlyAverage={stats.yearlyAverage}
        onEditClick={() => setIsEditing(true)}
        onSettingsClick={onSettingsClick || (() => {})}
      />

      {/* Tag Activity Analytics */}
      <div className="px-4 mt-4">
        <TagActivityChart />
      </div>

      {/* Edit Profile Modal - Zine style */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f5f0e8] border-2 border-black/10 p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3
                  className="font-bold text-black uppercase tracking-wide"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Edit Profile
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 bg-black/10 hover:bg-black/20 transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3">
                   <div className="w-20 h-20 bg-white border-2 border-black/10 overflow-hidden">
                      {editForm.avatar_url ? (
                        <img src={editForm.avatar_url} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <User className="w-8 h-8 m-auto mt-6 text-black/30" />
                      )}
                   </div>
                   <div>
                     <input
                       type="file"
                       id="avatar-upload"
                       hidden
                       accept="image/*"
                       onChange={handleAvatarUpload}
                       disabled={uploading}
                     />
                     <label
                       htmlFor="avatar-upload"
                       className="cursor-pointer px-4 py-2 bg-black text-white text-xs font-medium hover:bg-black/80 flex items-center gap-2"
                       style={{ fontFamily: "'Space Mono', monospace" }}
                     >
                        <Camera className="w-3.5 h-3.5" />
                        {uploading ? "Uploading..." : "Change Photo"}
                     </label>
                   </div>
                </div>

                <div className="space-y-3">
                   <div>
                     <label
                       className="text-[10px] text-black/40 uppercase tracking-wider ml-1 mb-1 block"
                       style={{ fontFamily: "'Space Mono', monospace" }}
                     >
                       Display Name
                     </label>
                     <Input
                       value={editForm.display_name || ""}
                       onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                       className="bg-white border-2 border-black/10 text-black"
                     />
                   </div>

                   <div>
                     <label
                       className="text-[10px] text-black/40 uppercase tracking-wider ml-1 mb-1 block"
                       style={{ fontFamily: "'Space Mono', monospace" }}
                     >
                       Username
                     </label>
                     <Input
                       value={editForm.username || ""}
                       onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                       className="bg-white border-2 border-black/10 text-black"
                     />
                   </div>

                   <div>
                     <label
                       className="text-[10px] text-black/40 uppercase tracking-wider ml-1 mb-1 block"
                       style={{ fontFamily: "'Space Mono', monospace" }}
                     >
                       Bio
                     </label>
                     <Textarea
                       value={editForm.bio || ""}
                       onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                       className="bg-white border-2 border-black/10 text-black resize-none"
                       maxLength={150}
                     />
                   </div>
                </div>

                <Button
                   onClick={handleUpdateProfile}
                   className="w-full gap-2 bg-black text-white hover:bg-black/80"
                   style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StatsTab;