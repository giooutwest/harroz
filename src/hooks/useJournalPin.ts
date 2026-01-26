import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useJournalPin = () => {
  const { user } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has a PIN set
  useEffect(() => {
    const checkHasPin = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('journal_pin_hash')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setHasPin(!!data?.journal_pin_hash);
      } catch (error) {
        console.error('Error checking PIN status:', error);
        setHasPin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHasPin();
  }, [user]);

  // Verify PIN against stored hash
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('verify_journal_pin', {
        p_user_id: user.id,
        p_pin: pin
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }, [user]);

  // Set up a new PIN
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('set_journal_pin', {
        p_user_id: user.id,
        p_pin: pin
      });

      if (error) throw error;

      if (data === true) {
        setHasPin(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
  }, [user]);

  // Change PIN (verify old, set new)
  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!user) return false;

    // First verify the old PIN
    const isValid = await verifyPin(oldPin);
    if (!isValid) return false;

    // Then set the new PIN
    return setupPin(newPin);
  }, [user, verifyPin, setupPin]);

  return {
    hasPin,
    isLoading,
    verifyPin,
    setupPin,
    changePin
  };
};
