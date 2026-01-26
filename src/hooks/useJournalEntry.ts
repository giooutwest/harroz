import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getLocalDateString } from '@/hooks/useTimeWindow';

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  content: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export const useJournalEntry = (date?: string) => {
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<string[]>([]);

  const targetDate = date || getLocalDateString();

  // Check if entry is editable (same day only)
  const canEdit = targetDate === getLocalDateString();

  // Fetch entry for the given date
  const fetchEntry = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // @ts-ignore - Table may not be in generated types yet
      const { data, error } = await supabase
        .from('private_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (error) throw error;
      setEntry(data);

      // Get signed URLs for photos
      if (data?.photos && data.photos.length > 0) {
        const urls = await Promise.all(
          data.photos.map(async (photoPath: string) => {
            const { data: signedData } = await supabase.storage
              .from('mood-photos')
              .createSignedUrl(photoPath, 3600);
            return signedData?.signedUrl || '';
          })
        );
        setSignedPhotoUrls(urls.filter(Boolean));
      } else {
        setSignedPhotoUrls([]);
      }
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      setEntry(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, targetDate]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  // Upload a single photo and return its path
  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/journal/${targetDate}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('mood-photos')
      .upload(fileName, file);

    if (error) {
      console.error('Photo upload failed:', error);
      return null;
    }

    return fileName;
  };

  // Save or update journal entry
  const saveEntry = useCallback(async (
    content: string,
    newPhotos?: File[],
    existingPhotoPaths?: string[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Upload new photos
      let uploadedPaths: string[] = [];
      if (newPhotos && newPhotos.length > 0) {
        const results = await Promise.all(newPhotos.map(uploadPhoto));
        uploadedPaths = results.filter((p): p is string => p !== null);
      }

      // Combine existing and new photo paths
      const allPhotos = [...(existingPhotoPaths || []), ...uploadedPaths];

      // @ts-ignore - Table may not be in generated types yet
      const { error } = await supabase
        .from('private_journal_entries')
        .upsert({
          user_id: user.id,
          date: targetDate,
          content: content || null,
          photos: allPhotos
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      // Refresh the entry
      await fetchEntry();
      return true;
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return false;
    }
  }, [user, targetDate, fetchEntry]);

  // Delete journal entry
  const deleteEntry = useCallback(async (): Promise<boolean> => {
    if (!user || !entry) return false;

    try {
      // Delete photos from storage
      if (entry.photos && entry.photos.length > 0) {
        await supabase.storage
          .from('mood-photos')
          .remove(entry.photos);
      }

      // @ts-ignore - Table may not be in generated types yet
      const { error } = await supabase
        .from('private_journal_entries')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      setEntry(null);
      setSignedPhotoUrls([]);
      return true;
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      return false;
    }
  }, [user, entry]);

  // Delete a specific photo from the entry
  const deletePhoto = useCallback(async (photoPath: string): Promise<boolean> => {
    if (!user || !entry) return false;

    try {
      // Remove from storage
      await supabase.storage
        .from('mood-photos')
        .remove([photoPath]);

      // Update entry with remaining photos
      const remainingPhotos = entry.photos.filter(p => p !== photoPath);

      // @ts-ignore
      const { error } = await supabase
        .from('private_journal_entries')
        .update({ photos: remainingPhotos })
        .eq('id', entry.id);

      if (error) throw error;

      await fetchEntry();
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }, [user, entry, fetchEntry]);

  return {
    entry,
    isLoading,
    signedPhotoUrls,
    canEdit,
    saveEntry,
    deleteEntry,
    deletePhoto,
    refetch: fetchEntry
  };
};

// Hook to fetch multiple journal entries (for calendar view)
export const useJournalEntries = (year: number, month: number) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

        // @ts-ignore
        const { data, error } = await supabase
          .from('private_journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', firstDay)
          .lte('date', lastDay);

        if (error) throw error;

        // Convert to record keyed by date
        const entriesMap: Record<string, JournalEntry> = {};
        (data || []).forEach((entry: JournalEntry) => {
          entriesMap[entry.date] = entry;
        });

        setEntries(entriesMap);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
        setEntries({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [user, year, month]);

  return { entries, isLoading };
};
