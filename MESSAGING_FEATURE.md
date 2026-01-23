# 💬 Messaging Feature

## Overview
Added full direct messaging functionality to the Roz app, allowing friends to send private messages to each other.

## What's Included

### Database
**New Table: `messages`**
- Stores direct messages between users
- Fields: sender_id, receiver_id, content, read status, timestamps
- RLS policies for privacy
- Indexes for performance

**Automatic Push Notifications**
- Trigger sends push notification for every new message
- Shows sender name and message preview
- Integrated with existing push notification system

### UI Components

**MessagesTab** (`/src/components/MessagesTab.tsx`)
- **Conversations List View**:
  - Shows all conversations with friends
  - Displays last message and timestamp
  - Unread message count badges
  - Friend avatars and names

- **Chat View**:
  - Message thread for selected conversation
  - Chat bubbles (blue for sent, gray for received)
  - Timestamps for each message
  - Real-time updates
  - Auto-scroll to latest message

**Bottom Navigation**
- New "Messages" tab added
- MessageCircle icon
- Positioned between Friends and You tabs

**FriendProfileModal Update**
- Added "Send Message" button
- Opens chat with selected friend
- Callback prop `onMessage` for navigation

## Features

### ✅ Real-Time Messaging
- Uses Supabase real-time subscriptions
- Messages appear instantly
- No refresh needed

### ✅ Unread Indicators
- Badge shows unread message count
- Auto-marks messages as read when viewing
- Updates conversation list in real-time

### ✅ Smart UX
- Press Enter to send message
- Auto-scroll to bottom on new messages
- Loading states
- Empty state messages

### ✅ Privacy & Security
- RLS policies ensure users only see their messages
- Can only message friends
- Can delete sent messages

## How to Use

### As a User:
1. **Navigate to Messages tab** (4th icon in bottom nav)
2. **See your conversations** - list shows recent chats
3. **Start a new message** - tap the + button in the top right
4. **Select a friend** from the modal to start messaging
5. **Tap a conversation** to open chat
6. **Type and send** - press Enter or tap send button
7. **Back button** returns to conversations list

### From Friend Profile:
1. Open friend's profile (from Friends tab)
2. **Tap "Send Message" button**
3. Opens chat with that friend

### New Message Button (✨ NEW):
1. In Messages tab, tap the **+ button** in the header
2. A modal opens showing all your friends
3. **Search** for a friend using the search bar
4. **Tap a friend** to start a new conversation
5. Chat opens immediately

## Setup Required

### 1. Apply Database Migration
Run this SQL in Supabase SQL Editor:
```sql
-- Apply the migration file:
supabase/migrations/20260122000002_create_messages.sql
```

Or copy the entire file contents and run in SQL Editor.

### 2. Deploy Your App
```bash
npm run build
git push
```

### 3. Test It Out!
- Send a message to a friend
- Check push notifications
- Verify real-time updates

## Technical Details

### Real-Time Subscription
```typescript
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `receiver_id=eq.${user.id}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe()
```

### Message Query Pattern
```typescript
// Get conversation between two users
supabase
  .from('messages')
  .select('*')
  .or(`
    and(sender_id.eq.${userId},receiver_id.eq.${friendId}),
    and(sender_id.eq.${friendId},receiver_id.eq.${userId})
  `)
  .order('created_at', { ascending: true })
```

## Future Enhancements (Optional)
- [ ] Message reactions (like/emoji)
- [ ] Voice messages
- [ ] Photo/image sharing
- [ ] Typing indicators
- [ ] Message deletion (for both users)
- [ ] Group chats
- [ ] Message search
- [ ] Archive conversations

## Notes
- Messages are only between friends (must be accepted friendship)
- Push notifications sent for every new message
- Messages stored indefinitely (add auto-delete later if needed)
- Read receipts show when receiver opens the chat
