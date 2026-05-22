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
      ai_actors: {
        Row: {
          body_type: string | null
          category: string
          created_at: string
          default_style: string | null
          face_prompt: string | null
          id: string
          is_preset: boolean
          name: string
          thumbnail_url: string | null
          user_id: string | null
          voice_style: string | null
        }
        Insert: {
          body_type?: string | null
          category?: string
          created_at?: string
          default_style?: string | null
          face_prompt?: string | null
          id?: string
          is_preset?: boolean
          name: string
          thumbnail_url?: string | null
          user_id?: string | null
          voice_style?: string | null
        }
        Update: {
          body_type?: string | null
          category?: string
          created_at?: string
          default_style?: string | null
          face_prompt?: string | null
          id?: string
          is_preset?: boolean
          name?: string
          thumbnail_url?: string | null
          user_id?: string | null
          voice_style?: string | null
        }
        Relationships: []
      }
      ai_locations: {
        Row: {
          category: string
          created_at: string
          id: string
          is_preset: boolean
          mood: string | null
          name: string
          scene_prompt: string
          thumbnail_url: string | null
          time_of_day: string | null
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_preset?: boolean
          mood?: string | null
          name: string
          scene_prompt: string
          thumbnail_url?: string | null
          time_of_day?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_preset?: boolean
          mood?: string | null
          name?: string
          scene_prompt?: string
          thumbnail_url?: string | null
          time_of_day?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      controller_jobs: {
        Row: {
          attempts: number
          comfy_prompt_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          name: string
          node_id: string | null
          node_name: string | null
          params: Json | null
          priority: number
          progress: number
          prompt: string | null
          queued_at: string
          required_vram_gb: number | null
          result_urls: Json | null
          started_at: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          workflow: Json | null
        }
        Insert: {
          attempts?: number
          comfy_prompt_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          name: string
          node_id?: string | null
          node_name?: string | null
          params?: Json | null
          priority?: number
          progress?: number
          prompt?: string | null
          queued_at?: string
          required_vram_gb?: number | null
          result_urls?: Json | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workflow?: Json | null
        }
        Update: {
          attempts?: number
          comfy_prompt_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          name?: string
          node_id?: string | null
          node_name?: string | null
          params?: Json | null
          priority?: number
          progress?: number
          prompt?: string | null
          queued_at?: string
          required_vram_gb?: number | null
          result_urls?: Json | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workflow?: Json | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credit_balance: number
          display_name: string | null
          email: string | null
          id: string
          is_promo_customer: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credit_balance?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_promo_customer?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credit_balance?: number
          display_name?: string | null
          email?: string | null
          id?: string
          is_promo_customer?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_tracker: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_memory: {
        Row: {
          created_at: string
          id: string
          improved_prompt: string | null
          model: string | null
          prompt: string
          rating: number | null
          result_url: string | null
          settings: Json | null
          style: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improved_prompt?: string | null
          model?: string | null
          prompt: string
          rating?: number | null
          result_url?: string | null
          settings?: Json | null
          style?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improved_prompt?: string | null
          model?: string | null
          prompt?: string
          rating?: number | null
          result_url?: string | null
          settings?: Json | null
          style?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      render_logs: {
        Row: {
          cfg: number | null
          created_at: string
          height: number | null
          id: string
          ip_weight: number | null
          layers: Json | null
          preset: string | null
          pulid_weight: number | null
          render_duration_ms: number | null
          sampler: string | null
          scheduler: string | null
          steps: number | null
          supir_strength: number | null
          user_id: string | null
          width: number | null
        }
        Insert: {
          cfg?: number | null
          created_at?: string
          height?: number | null
          id?: string
          ip_weight?: number | null
          layers?: Json | null
          preset?: string | null
          pulid_weight?: number | null
          render_duration_ms?: number | null
          sampler?: string | null
          scheduler?: string | null
          steps?: number | null
          supir_strength?: number | null
          user_id?: string | null
          width?: number | null
        }
        Update: {
          cfg?: number | null
          created_at?: string
          height?: number | null
          id?: string
          ip_weight?: number | null
          layers?: Json | null
          preset?: string | null
          pulid_weight?: number | null
          render_duration_ms?: number | null
          sampler?: string | null
          scheduler?: string | null
          steps?: number | null
          supir_strength?: number | null
          user_id?: string | null
          width?: number | null
        }
        Relationships: []
      }
      renders: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: number
          render_type: string | null
          status: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: number
          render_type?: string | null
          status?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: number
          render_type?: string | null
          status?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "renders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_projects: {
        Row: {
          created_at: string
          id: string
          original_prompt: string
          scenes: Json | null
          script: Json | null
          status: string
          style: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_prompt: string
          scenes?: Json | null
          script?: Json | null
          status?: string
          style?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_prompt?: string
          scenes?: Json | null
          script?: Json | null
          status?: string
          style?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: number
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_promo_count: { Args: never; Returns: number }
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
    },
  },
} as const
