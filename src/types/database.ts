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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          payload: Json
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payload: Json
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          payload?: Json
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          created_at: string
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id: number
          is_correct: boolean
          pack_id: number | null
          user_id: string
          word_id: number
        }
        Insert: {
          created_at?: string
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id?: never
          is_correct: boolean
          pack_id?: number | null
          user_id: string
          word_id: number
        }
        Update: {
          created_at?: string
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: never
          is_correct?: boolean
          pack_id?: number | null
          user_id?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempts_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pack_progress"
            referencedColumns: ["pack_id"]
          },
          {
            foreignKeyName: "attempts_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "weak_words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          payload: Json | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          payload?: Json | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          payload?: Json | null
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      dictionary_cache: {
        Row: {
          fetched_at: string
          payload: Json
          word: string
        }
        Insert: {
          fetched_at?: string
          payload: Json
          word: string
        }
        Update: {
          fetched_at?: string
          payload?: Json
          word?: string
        }
        Relationships: []
      }
      packs: {
        Row: {
          book: number
          first_word: string
          id: number
          last_word: string
          pack_number: number
          word_count: number
        }
        Insert: {
          book: number
          first_word: string
          id?: never
          last_word: string
          pack_number: number
          word_count: number
        }
        Update: {
          book?: number
          first_word?: string
          id?: never
          last_word?: string
          pack_number?: number
          word_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      word_progress: {
        Row: {
          correct_count: number
          last_reviewed: string | null
          mastery: number
          next_due: string | null
          user_id: string
          word_id: number
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          last_reviewed?: string | null
          mastery?: number
          next_due?: string | null
          user_id: string
          word_id: number
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          last_reviewed?: string | null
          mastery?: number
          next_due?: string | null
          user_id?: string
          word_id?: number
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "word_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "weak_words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          book: number
          created_at: string
          definition: string | null
          example_sentences: string[] | null
          first_letter: string | null
          id: number
          notes: string | null
          pack_id: number
          part_of_speech: string | null
          pronunciation: string | null
          word: string
        }
        Insert: {
          book?: number
          created_at?: string
          definition?: string | null
          example_sentences?: string[] | null
          first_letter?: string | null
          id?: number
          notes?: string | null
          pack_id: number
          part_of_speech?: string | null
          pronunciation?: string | null
          word: string
        }
        Update: {
          book?: number
          created_at?: string
          definition?: string | null
          example_sentences?: string[] | null
          first_letter?: string | null
          id?: number
          notes?: string | null
          pack_id?: number
          part_of_speech?: string | null
          pronunciation?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "words_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pack_progress"
            referencedColumns: ["pack_id"]
          },
          {
            foreignKeyName: "words_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exercise_accuracy: {
        Row: {
          accuracy: number | null
          attempts: number | null
          exercise_type: Database["public"]["Enums"]["exercise_type"] | null
        }
        Relationships: []
      }
      pack_progress: {
        Row: {
          book: number | null
          mastered: number | null
          pack_id: number | null
          pack_number: number | null
          seen: number | null
          word_count: number | null
        }
        Relationships: []
      }
      weak_words: {
        Row: {
          book: number | null
          correct_count: number | null
          definition: string | null
          id: number | null
          mastery: number | null
          pack_id: number | null
          part_of_speech: string | null
          word: string | null
          wrong_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "words_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pack_progress"
            referencedColumns: ["pack_id"]
          },
          {
            foreignKeyName: "words_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      record_attempt: {
        Args: {
          p_correct: boolean
          p_pack_id: number
          p_type: Database["public"]["Enums"]["exercise_type"]
          p_word_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      exercise_type:
        | "flashcard"
        | "matching"
        | "fill_blank"
        | "syn_ant"
        | "ai_mixed"
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
      exercise_type: [
        "flashcard",
        "matching",
        "fill_blank",
        "syn_ant",
        "ai_mixed",
      ],
    },
  },
} as const
