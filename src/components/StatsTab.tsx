import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sun, TrendingUp, PieChart, Sparkles, Camera, Edit2, Save, X, User, Clock, Activity } from "lucide-react";
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
  isPixelTheme?: boolean;
}

const getMoodColor = (rating: number): string => {
  if (rating <= 2) return "hsl(0, 70%, 50%)";
  if (rating <= 4) return "hsl(30, 80%, 55%)";
  if (rating <= 6) return "hsl(50, 90%, 55%)";
  if (rating <= 8) return "hsl(140, 55%, 45%)";
  return "hsl(210, 80%, 55%)";
};

const StatsTab = ({ isPixelTheme = false }: StatsTabProps) => {
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
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          {isPixelTheme ? (
            <PixelStar className="w-8 h-8 text-primary" />
          ) : (
            <Sparkles className="w-8 h-8 text-primary" />
          )}
        </motion.div>
      </div>
    );
  }

  const FlameIcon = isPixelTheme ? PixelFlame : Flame;
  const SunIcon = isPixelTheme ? PixelStar : Sun;
  const TrendIcon = isPixelTheme ? PixelChart : TrendingUp;

  const statCards = [
    {
      icon: FlameIcon,
      label: "Current Streak",
      value: `${stats.currentStreak} days`,
      color: "hsl(30, 80%, 55%)",
      description: "Keep the momentum! 🔥",
    },
    {
      icon: FlameIcon,
      label: "Best Streak",
      value: `${stats.bestStreak} days`,
      color: "hsl(0, 70%, 50%)",
      description: "Your personal best!",
    },
    {
      icon: SunIcon,
      label: "Sunny Days",
      value: `${stats.totalGoodDays}`,
      color: "hsl(50, 90%, 55%)",
      description: `${stats.totalEntries > 0 ? Math.round((stats.totalGoodDays / stats.totalEntries) * 100) : 0}% of all days ☀️`,
    },
    {
      icon: TrendIcon,
      label: "Average Weather",
      value: stats.yearlyAverage.toFixed(1),
      color: getMoodColor(Math.round(stats.yearlyAverage)),
      description: `From ${stats.totalEntries} check-ins`,
    },
  ];

  return (
    <div className="px-4 py-6 pb-28">
      
      {/* 1. NEW PROFILE HEADER */}
      <div className="mb-8 flex flex-col items-center text-center">
        {/* Avatar Container */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-4"
        >
          <div className={`w-24 h-24 bg-secondary overflow-hidden border-4 border-background shadow-xl ${
            isPixelTheme ? "" : "rounded-full"
          }`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* 🔥 STREAK BADGE: Positioned Absolute to the RIGHT of the Avatar */}
          <div className={`absolute top-1/2 left-full ml-3 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-600 border border-orange-200 shadow-sm whitespace-nowrap ${
               isPixelTheme ? "text-xs border-2" : "text-sm rounded-full"
             }`}>
               <Flame className="w-3.5 h-3.5 fill-orange-500" /> 
               <span className="font-bold">{stats.currentStreak}</span>
          </div>

          {/* Edit Button */}
          <button 
            onClick={() => setIsEditing(true)}
            className={`absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform ${
              isPixelTheme ? "" : "rounded-full"
            }`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Name & Bio - Centered Below */}
        <motion.div
           initial={{ y: 10, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1 }}
           className="w-full max-w-xs"
        >
          <h1 className={`font-bold mb-1 ${isPixelTheme ? "text-lg" : "text-2xl"}`}>
            {profile?.display_name || "New User"}
          </h1>
          
          <p className={`text-muted-foreground mb-3 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
            @{profile?.username || "username"}
          </p>

          {profile?.bio && (
            <p className={`text-muted-foreground/80 mb-4 px-4 ${isPixelTheme ? "text-[10px]" : "text-sm"}`}>
              {profile.bio}
            </p>
          )}

          <Button 
             variant="outline" 
             size="sm"
             onClick={() => setIsEditing(true)}
             className={`mx-auto flex ${isPixelTheme ? "text-xs h-7" : "rounded-full h-8"}`}
          >
            Edit Profile
          </Button>
        </motion.div>
      </div>

      <div className={`h-px w-full bg-border mb-8 ${isPixelTheme ? "" : "opacity-50"}`} />

      {/* 2. EXISTING STATS CONTENT */}
      {stats.totalEntries === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             className={`w-20 h-20 bg-secondary flex items-center justify-center mb-4 ${isPixelTheme ? "" : "rounded-full"}`}
           >
             {isPixelTheme ? (
               <PixelChart className="w-10 h-10 text-muted-foreground" />
             ) : (
               <PieChart className="w-10 h-10 text-muted-foreground" />
             )}
           </motion.div>
           <h2 className={`font-bold mb-2 ${isPixelTheme ? "text-sm" : "text-lg"}`}>No stats yet!</h2>
           <p className={`text-muted-foreground ${isPixelTheme ? "text-xs" : "text-sm"}`}>
             Start logging your moods to unlock your insights.
           </p>
         </div>
      ) : (
        <>
          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-semibold mb-4 px-1 ${isPixelTheme ? "text-xs" : "text-lg"}`}
          >
            Insights
          </motion.h3>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-card border border-border p-5 relative overflow-hidden ${isPixelTheme ? "" : "rounded-2xl"}`}
                >
                  <div 
                    className={`absolute top-0 right-0 w-20 h-20 blur-3xl opacity-30 ${isPixelTheme ? "" : "rounded-full"}`}
                    style={{ backgroundColor: stat.color }}
                  />
                  <Icon 
                    className="w-8 h-8 mb-3" 
                    style={{ color: stat.color }}
                  />
                  <p className={`text-muted-foreground font-medium uppercase tracking-wide ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                    {stat.label}
                  </p>
                  <p className={`font-bold mt-1 ${isPixelTheme ? "text-sm" : "text-2xl"}`} style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className={`text-muted-foreground mt-1 ${isPixelTheme ? "text-[6px]" : "text-xs"}`}>
                    {stat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Time Travel / On This Day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <OnThisDay isPixelTheme={isPixelTheme} />
          </motion.div>

          {/* Activity Insights / Tag Correlation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <TagActivityChart isPixelTheme={isPixelTheme} />
          </motion.div>

          {stats.moodDistribution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className={`bg-card border border-border p-6 ${isPixelTheme ? "" : "rounded-2xl"}`}
            >
              <h3 className={`font-semibold mb-4 text-center ${isPixelTheme ? "text-xs" : "text-lg"}`}>Weather Patterns</h3>
              
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={stats.moodDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.moodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {stats.moodDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 ${isPixelTheme ? "" : "rounded-full"}`}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`text-muted-foreground ${isPixelTheme ? "text-[8px]" : "text-sm"}`}>
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* 3. EDIT PROFILE MODAL (OVERLAY) */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-card border border-border p-6 w-full max-w-sm shadow-2xl ${
                isPixelTheme ? "border-2" : "rounded-3xl"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-semibold ${isPixelTheme ? "text-sm" : "text-lg"}`}>Edit Profile</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className={`p-2 bg-secondary ${isPixelTheme ? "" : "rounded-full"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3">
                   <div className={`w-20 h-20 bg-secondary overflow-hidden ${isPixelTheme ? "" : "rounded-full"}`}>
                      {editForm.avatar_url ? (
                        <img src={editForm.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 m-auto mt-6 text-muted-foreground" />
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
                       className={`cursor-pointer px-4 py-2 bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 flex items-center gap-2 ${isPixelTheme ? "" : "rounded-full"}`}
                     >
                        <Camera className="w-3.5 h-3.5" />
                        {uploading ? "Uploading..." : "Change Photo"}
                     </label>
                   </div>
                </div>

                <div className="space-y-3">
                   <div>
                     <label className="text-xs text-muted-foreground ml-1 mb-1 block">Display Name</label>
                     <Input 
                       value={editForm.display_name || ""}
                       onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                       className={isPixelTheme ? "text-xs" : ""}
                     />
                   </div>
                   
                   <div>
                     <label className="text-xs text-muted-foreground ml-1 mb-1 block">Username</label>
                     <Input 
                       value={editForm.username || ""}
                       onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                       className={isPixelTheme ? "text-xs" : ""}
                     />
                   </div>

                   <div>
                     <label className="text-xs text-muted-foreground ml-1 mb-1 block">Bio</label>
                     <Textarea 
                       value={editForm.bio || ""}
                       onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                       className={isPixelTheme ? "text-xs" : "resize-none"}
                       maxLength={150}
                     />
                   </div>
                </div>

                <Button 
                   onClick={handleUpdateProfile} 
                   className={`w-full gap-2 ${isPixelTheme ? "text-xs" : "rounded-full"}`}
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