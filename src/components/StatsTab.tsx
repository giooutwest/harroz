import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sun, TrendingUp, PieChart, Sparkles, Camera, Edit2, Save, X, User, Clock, Activity, Settings, Share2 } from "lucide-react";
import WeeklyRecap from "./WeeklyRecap";
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
import { useBadges } from "@/hooks/useBadges";
import { useTheme } from "@/hooks/useTheme";

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
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { earnedBadges } = useBadges();
  const { isClassic } = useTheme();

  // Get equipped badges for the current user
  const equippedBadges = earnedBadges.filter(b => b.is_equipped).map(b => b.badge_id);

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
      <div className={`flex items-center justify-center min-h-[calc(100vh-120px)] ${isClassic ? 'bg-background' : 'bg-[#f5f0e8]'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className={`w-8 h-8 border-2 border-t-transparent ${isClassic ? 'border-foreground' : 'border-black'}`}
        />
      </div>
    );
  }

  return (
    <div className="pb-28">
      {isClassic ? (
        /* Classic Profile View - Simple cards */
        <div className="px-6 py-8 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-secondary rounded-full overflow-hidden flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{profile?.display_name || "You"}</h1>
                {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
              </div>
            </div>
            <button onClick={onSettingsClick} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Streak */}
          {stats.currentStreak > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.currentStreak} Day Streak</p>
                <p className="text-sm text-muted-foreground">Keep it going!</p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <Flame className="w-5 h-5 text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.bestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <Sun className="w-5 h-5 text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.totalGoodDays}</p>
              <p className="text-xs text-muted-foreground">Sunny Days</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <TrendingUp className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.yearlyAverage.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Average Mood</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <Activity className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors text-sm"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShowWeeklyRecap(true)}
              className="py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Weekly Recap
            </button>
          </div>
        </div>
      ) : (
        /* Zine Profile View - Dossier style */
        <>
          <ZineProfileView
            displayName={profile?.display_name || null}
            username={profile?.username || null}
            avatarUrl={profile?.avatar_url || null}
            currentStreak={stats.currentStreak}
            bestStreak={stats.bestStreak}
            totalGoodDays={stats.totalGoodDays}
            totalEntries={stats.totalEntries}
            yearlyAverage={stats.yearlyAverage}
            equippedBadges={equippedBadges}
            onEditClick={() => setIsEditing(true)}
            onSettingsClick={onSettingsClick || (() => {})}
          />
          {/* Weekly Recap Button for Zine view */}
          <div className="px-4 mt-4">
            <button
              onClick={() => setShowWeeklyRecap(true)}
              className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-black/90 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Weekly Recap
            </button>
          </div>
        </>
      )}

      {/* Tag Activity Analytics */}
      <div className="px-4 mt-4">
        <TagActivityChart />
      </div>

      {/* Edit Profile Modal */}
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
              className={`p-6 w-full max-w-sm shadow-2xl rounded-2xl ${isClassic ? 'bg-card border border-border' : 'bg-[#f5f0e8] border-2 border-black/10'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-bold uppercase tracking-wide ${isClassic ? 'text-foreground' : 'text-black'}`}>
                  Edit Profile
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className={`p-2 rounded-full transition-colors ${isClassic ? 'bg-secondary hover:bg-secondary/80' : 'bg-black/10 hover:bg-black/20'}`}
                >
                  <X className={`w-5 h-5 ${isClassic ? 'text-foreground' : 'text-black'}`} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                   <div className={`w-20 h-20 overflow-hidden rounded-full ${isClassic ? 'bg-secondary' : 'bg-white border-2 border-black/10'}`}>
                      {editForm.avatar_url ? (
                        <img src={editForm.avatar_url} className={`w-full h-full object-cover ${isClassic ? '' : 'grayscale'}`} />
                      ) : (
                        <User className={`w-8 h-8 m-auto mt-6 ${isClassic ? 'text-muted-foreground' : 'text-black/30'}`} />
                      )}
                   </div>
                   <div>
                     <input type="file" id="avatar-upload" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                     <label
                       htmlFor="avatar-upload"
                       className={`cursor-pointer px-4 py-2 text-xs font-medium flex items-center gap-2 rounded-lg ${isClassic ? 'bg-primary text-primary-foreground' : 'bg-black text-white hover:bg-black/80'}`}
                     >
                        <Camera className="w-3.5 h-3.5" />
                        {uploading ? "Uploading..." : "Change Photo"}
                     </label>
                   </div>
                </div>

                <div className="space-y-3">
                   <div>
                     <label className={`text-xs mb-1 block ${isClassic ? 'text-muted-foreground' : 'text-black/40 uppercase tracking-wider text-[10px]'}`}>
                       Display Name
                     </label>
                     <Input value={editForm.display_name || ""} onChange={(e) => setEditForm({...editForm, display_name: e.target.value})} />
                   </div>
                   <div>
                     <label className={`text-xs mb-1 block ${isClassic ? 'text-muted-foreground' : 'text-black/40 uppercase tracking-wider text-[10px]'}`}>
                       Username
                     </label>
                     <Input value={editForm.username || ""} onChange={(e) => setEditForm({...editForm, username: e.target.value})} />
                   </div>
                   <div>
                     <label className={`text-xs mb-1 block ${isClassic ? 'text-muted-foreground' : 'text-black/40 uppercase tracking-wider text-[10px]'}`}>
                       Bio
                     </label>
                     <Textarea value={editForm.bio || ""} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} className="resize-none" maxLength={150} />
                   </div>
                </div>

                <Button onClick={handleUpdateProfile} className="w-full gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Recap Modal */}
      <WeeklyRecap
        isOpen={showWeeklyRecap}
        onClose={() => setShowWeeklyRecap(false)}
      />
    </div>
  );
};

export default StatsTab;