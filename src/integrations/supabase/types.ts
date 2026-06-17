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
      ai_chats: {
        Row: {
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eco_points: {
        Row: {
          created_at: string
          id: string
          pickup_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pickup_id?: string | null
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pickup_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_points_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          pickup_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          pickup_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pickup_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_messages_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      pickups: {
        Row: {
          address: string
          category: Database["public"]["Enums"]["waste_category"]
          created_at: string
          customer_id: string
          customer_snapshot: Json | null
          description: string | null
          estimated_amount: number | null
          estimated_weight_kg: number
          final_amount: number | null
          final_weight_kg: number | null
          id: string
          latitude: number | null
          longitude: number | null
          payment_status: string
          photo_urls: string[]
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["pickup_status"]
          updated_at: string
          vendor_id: string | null
          vendor_snapshot: Json | null
        }
        Insert: {
          address: string
          category: Database["public"]["Enums"]["waste_category"]
          created_at?: string
          customer_id: string
          customer_snapshot?: Json | null
          description?: string | null
          estimated_amount?: number | null
          estimated_weight_kg: number
          final_amount?: number | null
          final_weight_kg?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_status?: string
          photo_urls?: string[]
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
          vendor_id?: string | null
          vendor_snapshot?: Json | null
        }
        Update: {
          address?: string
          category?: Database["public"]["Enums"]["waste_category"]
          created_at?: string
          customer_id?: string
          customer_snapshot?: Json | null
          description?: string | null
          estimated_amount?: number | null
          estimated_weight_kg?: number
          final_amount?: number | null
          final_weight_kg?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_status?: string
          photo_urls?: string[]
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
          vendor_id?: string | null
          vendor_snapshot?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          vehicle_info: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
          vehicle_info?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          vehicle_info?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          active: boolean
          category: string
          cost_points: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          active?: boolean
          category: string
          cost_points: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          active?: boolean
          category?: string
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
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
      app_role: "customer" | "vendor" | "admin"
      pickup_status:
        | "pending"
        | "accepted"
        | "on_the_way"
        | "arrived"
        | "collected"
        | "cash_paid"
        | "completed"
        | "rejected"
        | "cancelled"
      waste_category:
        | "plastic"
        | "paper"
        | "metal"
        | "glass"
        | "e_waste"
        | "organic"
        | "mixed"
        | "other"
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
      app_role: ["customer", "vendor", "admin"],
      pickup_status: [
        "pending",
        "accepted",
        "on_the_way",
        "arrived",
        "collected",
        "cash_paid",
        "completed",
        "rejected",
        "cancelled",
      ],
      waste_category: [
        "plastic",
        "paper",
        "metal",
        "glass",
        "e_waste",
        "organic",
        "mixed",
        "other",
      ],
    },
  },
} as const
