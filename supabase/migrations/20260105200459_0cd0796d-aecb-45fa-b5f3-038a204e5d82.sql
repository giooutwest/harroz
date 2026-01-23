-- Add constraints to feedback table for data validation
ALTER TABLE public.feedback 
  ADD CONSTRAINT feedback_message_length CHECK (char_length(message) <= 5000),
  ADD CONSTRAINT feedback_type_check CHECK (type IN ('general', 'bug', 'feature')),
  ADD CONSTRAINT feedback_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));