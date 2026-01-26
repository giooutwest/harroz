export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          title: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          title: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "mood_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          rating: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mood_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mood_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mood_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mood_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_comments_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mood_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_likes: {
        Row: {
          created_at: string
          id: string
          mood_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_likes_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      moods: {
        Row: {
          caption: string | null
          created_at: string
          date: string
          id: string
          note: string | null
          photo_url: string | null
          rating: number
          user_id: string | null
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          photo_url?: string | null
          rating: number
          user_id?: string | null
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          photo_url?: string | null
          rating?: number
          user_id?: string | null
          visibility?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          mood_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mood_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mood_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "mood_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_push_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          processed: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          processed?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          processed?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      private_journal_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          content: string | null
          photos: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          content?: string | null
          photos?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content?: string | null
          photos?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_visibility: string
          discoverable_by: string
          display_name: string | null
          id: string
          journal_pin_hash: string | null
          show_caption_to_friends: boolean
          show_comments_to_friends_only: boolean
          show_daily_quote: boolean
          show_photo_to_friends: boolean
          show_rating_to_friends: boolean
          updated_at: string
          user_id: string
          username: string | null
          current_streak: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_visibility?: string
          discoverable_by?: string
          display_name?: string | null
          id?: string
          journal_pin_hash?: string | null
          show_caption_to_friends?: boolean
          show_comments_to_friends_only?: boolean
          show_daily_quote?: boolean
          show_photo_to_friends?: boolean
          show_rating_to_friends?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          current_streak?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_visibility?: string
          discoverable_by?: string
          display_name?: string | null
          id?: string
          journal_pin_hash?: string | null
          show_caption_to_friends?: boolean
          show_comments_to_friends_only?: boolean
          show_daily_quote?: boolean
          show_photo_to_friends?: boolean
          show_rating_to_friends?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          current_streak?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      user_update_reads: {
        Row: {
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_view_user_comments: {
        Args: { commenter_id: string; viewer_id: string }
        Returns: boolean
      }
      count_daily_friend_requests: {
        Args: { requesting_user_id: string }
        Returns: number
      }
      is_close_friend: {
        Args: { owner_id: string; viewer_id: string }
        Returns: boolean
      }
      set_journal_pin: {
        Args: { p_user_id: string; p_pin: string }
        Returns: boolean
      }
      verify_journal_pin: {
        Args: { p_user_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "public"> // Simplified since InternalSupabase was removed manually above in your copy? Wait, no, I see you kept the structure. Let's keep your structure standard.

// Standard Helpers
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never