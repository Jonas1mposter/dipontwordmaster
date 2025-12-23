export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          rarity: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          name: string
          rarity?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          created_at: string
          description: string
          grade: number | null
          id: string
          is_active: boolean
          quest_type: string
          reward_amount: number
          reward_type: string
          target: number
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          grade?: number | null
          id?: string
          is_active?: boolean
          quest_type: string
          reward_amount: number
          reward_type: string
          target: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          grade?: number | null
          id?: string
          is_active?: boolean
          quest_type?: string
          reward_amount?: number
          reward_type?: string
          target?: number
          title?: string
        }
        Relationships: []
      }
      friend_battle_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          match_id: string | null
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string | null
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_battle_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ranked_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_battle_invites_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_battle_invites_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          incorrect_count: number
          last_reviewed_at: string | null
          mastery_level: number
          next_review_at: string | null
          profile_id: string
          updated_at: string
          word_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_at?: string | null
          profile_id: string
          updated_at?: string
          word_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_reviewed_at?: string | null
          mastery_level?: number
          next_review_at?: string | null
          profile_id?: string
          updated_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      level_progress: {
        Row: {
          attempts: number
          best_score: number
          completed_at: string | null
          created_at: string
          id: string
          level_id: string
          profile_id: string
          stars: number
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          level_id: string
          profile_id: string
          stars?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          best_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          level_id?: string
          profile_id?: string
          stars?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_progress_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          description: string | null
          energy_cost: number
          grade: number
          id: string
          name: string
          order_index: number
          unit: number
          word_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          energy_cost?: number
          grade: number
          id?: string
          name: string
          order_index: number
          unit: number
          word_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          energy_cost?: number
          grade?: number
          id?: string
          name?: string
          order_index?: number
          unit?: number
          word_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      name_cards: {
        Row: {
          background_gradient: string
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          rarity: string
        }
        Insert: {
          background_gradient: string
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          rarity?: string
        }
        Update: {
          background_gradient?: string
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          energy: number
          grade: number
          id: string
          level: number
          losses: number
          max_energy: number
          rank_points: number
          rank_stars: number
          rank_tier: Database["public"]["Enums"]["rank_tier"]
          streak: number
          updated_at: string
          user_id: string
          username: string
          wins: number
          xp: number
          xp_to_next_level: number
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          energy?: number
          grade: number
          id?: string
          level?: number
          losses?: number
          max_energy?: number
          rank_points?: number
          rank_stars?: number
          rank_tier?: Database["public"]["Enums"]["rank_tier"]
          streak?: number
          updated_at?: string
          user_id: string
          username: string
          wins?: number
          xp?: number
          xp_to_next_level?: number
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          energy?: number
          grade?: number
          id?: string
          level?: number
          losses?: number
          max_energy?: number
          rank_points?: number
          rank_stars?: number
          rank_tier?: Database["public"]["Enums"]["rank_tier"]
          streak?: number
          updated_at?: string
          user_id?: string
          username?: string
          wins?: number
          xp?: number
          xp_to_next_level?: number
        }
        Relationships: []
      }
      ranked_matches: {
        Row: {
          created_at: string
          ended_at: string | null
          grade: number
          id: string
          player1_id: string
          player1_score: number
          player2_id: string | null
          player2_score: number
          started_at: string | null
          status: string
          winner_id: string | null
          words: Json
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          grade: number
          id?: string
          player1_id: string
          player1_score?: number
          player2_id?: string | null
          player2_score?: number
          started_at?: string | null
          status?: string
          winner_id?: string | null
          words?: Json
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          grade?: number
          id?: string
          player1_id?: string
          player1_score?: number
          player2_id?: string | null
          player2_score?: number
          started_at?: string | null
          status?: string
          winner_id?: string | null
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ranked_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranked_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranked_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          grade: number
          id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          grade: number
          id?: string
          is_active?: boolean
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          grade?: number
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          equipped_slot: number | null
          id: string
          profile_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          equipped_slot?: number | null
          id?: string
          profile_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          equipped_slot?: number | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_name_cards: {
        Row: {
          earned_at: string
          id: string
          is_equipped: boolean
          name_card_id: string
          profile_id: string
          rank_position: number | null
        }
        Insert: {
          earned_at?: string
          id?: string
          is_equipped?: boolean
          name_card_id: string
          profile_id: string
          rank_position?: number | null
        }
        Update: {
          earned_at?: string
          id?: string
          is_equipped?: boolean
          name_card_id?: string
          profile_id?: string
          rank_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_name_cards_name_card_id_fkey"
            columns: ["name_card_id"]
            isOneToOne: false
            referencedRelation: "name_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_name_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          claimed: boolean
          completed: boolean
          created_at: string
          id: string
          profile_id: string
          progress: number
          quest_date: string
          quest_id: string
          updated_at: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          profile_id: string
          progress?: number
          quest_date?: string
          quest_id: string
          updated_at?: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          progress?: number
          quest_date?: string
          quest_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          created_at: string
          difficulty: number
          example: string | null
          grade: number
          id: string
          meaning: string
          phonetic: string | null
          unit: number
          word: string
        }
        Insert: {
          created_at?: string
          difficulty?: number
          example?: string | null
          grade: number
          id?: string
          meaning: string
          phonetic?: string | null
          unit?: number
          word: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          example?: string | null
          grade?: number
          id?: string
          meaning?: string
          phonetic?: string | null
          unit?: number
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      rank_tier:
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "diamond"
        | "champion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      rank_tier: [
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "champion",
      ],
    },
  },
} as const
