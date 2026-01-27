import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Simple hash function using Web Crypto API
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random salt
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

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

        if (error) {
          console.error('Error checking PIN:', error);
          setHasPin(false);
        } else {
          setHasPin(!!data?.journal_pin_hash);
        }
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
      const { data, error } = await supabase
        .from('profiles')
        .select('journal_pin_hash')
        .eq('user_id', user.id)
        .single();

      if (error || !data?.journal_pin_hash) return false;

      // The stored format is "salt:hash"
      const [salt, storedHash] = data.journal_pin_hash.split(':');
      if (!salt || !storedHash) return false;

      const inputHash = await hashPin(pin, salt);
      return inputHash === storedHash;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }, [user]);

  // Set up a new PIN
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      const pinHash = `${salt}:${hash}`;

      const { error } = await supabase
        .from('profiles')
        .update({ journal_pin_hash: pinHash })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error setting PIN:', error);
        return false;
      }

      setHasPin(true);
      return true;
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

  // Remove PIN
  const removePin = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ journal_pin_hash: null })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing PIN:', error);
        return false;
      }

      setHasPin(false);
      return true;
    } catch (error) {
      console.error('Error removing PIN:', error);
      return false;
    }
  }, [user]);

  return {
    hasPin,
    isLoading,
    verifyPin,
    setupPin,
    changePin,
    removePin
  };
};
