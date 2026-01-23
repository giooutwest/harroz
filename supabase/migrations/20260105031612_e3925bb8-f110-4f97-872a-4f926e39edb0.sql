-- Make mood-photos bucket private to protect user privacy
UPDATE storage.buckets 
SET public = false 
WHERE id = 'mood-photos';