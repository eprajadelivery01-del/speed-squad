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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string | null
          delivery_id: string
          id: string
          message: string
          read: boolean | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          id?: string
          message: string
          read?: boolean | null
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          id?: string
          message?: string
          read?: boolean | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          accepted_at: string | null
          assignment_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          collected_at: string | null
          company_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_latitude: number | null
          dropoff_longitude: number | null
          estimated_time_minutes: number | null
          estimated_value: number | null
          id: string
          notes: string | null
          picked_up_at: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          price: number | null
          proof_photo_url: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          assignment_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_latitude?: number | null
          dropoff_longitude?: number | null
          estimated_time_minutes?: number | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          price?: number | null
          proof_photo_url?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          assignment_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_latitude?: number | null
          dropoff_longitude?: number | null
          estimated_time_minutes?: number | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          price?: number | null
          proof_photo_url?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          document: string | null
          full_name: string
          id: string
          is_online: boolean | null
          last_location_update: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          online: boolean | null
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"] | null
          terms_accepted_at: string | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string
          vehicle_plate: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          document?: string | null
          full_name: string
          id?: string
          is_online?: boolean | null
          last_location_update?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          online?: boolean | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          terms_accepted_at?: string | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_plate?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          document?: string | null
          full_name?: string
          id?: string
          is_online?: boolean | null
          last_location_update?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          online?: boolean | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          terms_accepted_at?: string | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_plate?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_occurrences: {
        Row: {
          created_at: string | null
          delivery_id: string
          description: string
          driver_id: string
          id: string
          photo_url: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          type: Database["public"]["Enums"]["occurrence_type"] | null
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          description: string
          driver_id: string
          id?: string
          photo_url?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          type?: Database["public"]["Enums"]["occurrence_type"] | null
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          description?: string
          driver_id?: string
          id?: string
          photo_url?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          type?: Database["public"]["Enums"]["occurrence_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_occurrences_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_occurrences_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          delivery_id: string
          driver_id: string
          id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          delivery_id: string
          driver_id: string
          id?: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          delivery_id?: string
          driver_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          amount: number
          created_at: string | null
          delivery_id: string | null
          description: string | null
          driver_id: string
          id: string
          paid: boolean | null
          paid_at: string | null
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          delivery_id?: string | null
          description?: string | null
          driver_id: string
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          delivery_id?: string | null
          description?: string | null
          driver_id?: string
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          created_at: string | null
          delivery_id: string | null
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string | null
          speed: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_id?: string | null
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string | null
          speed?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_id?: string | null
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_location_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          active: boolean
          city: string | null
          color: string | null
          created_at: string
          description: string | null
          geometry: Json | null
          id: string
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          geometry?: Json | null
          id?: string
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          geometry?: Json | null
          id?: string
          name?: string
          price?: number | null
          updated_at?: string
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
      find_region_for_point: {
        Args: { _lat: number; _lng: number }
        Returns: {
          region_color: string
          region_id: string
          region_name: string
          region_price: number
        }[]
      }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
      has_profile_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_driver: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "driver"
        | "company"
        | "customer"
      assignment_type: "broadcast" | "direct"
      delivery_status:
        | "pending"
        | "accepted"
        | "collecting"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "returned"
      driver_status: "pending" | "active" | "rejected" | "suspended"
      occurrence_type: "delay" | "damage" | "absence" | "other"
      vehicle_type: "motorcycle" | "bicycle" | "car" | "van" | "truck"
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
      app_role: ["admin", "moderator", "user", "driver", "company", "customer"],
      assignment_type: ["broadcast", "direct"],
      delivery_status: [
        "pending",
        "accepted",
        "collecting",
        "in_transit",
        "delivered",
        "cancelled",
        "returned",
      ],
      driver_status: ["pending", "active", "rejected", "suspended"],
      occurrence_type: ["delay", "damage", "absence", "other"],
      vehicle_type: ["motorcycle", "bicycle", "car", "van", "truck"],
    },
  },
} as const
