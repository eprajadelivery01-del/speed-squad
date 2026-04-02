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
          banner_url: string | null
          city: string | null
          city_id: string | null
          created_at: string | null
          delivery_mode: string | null
          description: string | null
          document: string | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          banner_url?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string | null
          delivery_mode?: string | null
          description?: string | null
          document?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          banner_url?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string | null
          delivery_mode?: string | null
          description?: string | null
          document?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          city_id: string | null
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
          order_id: string | null
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
          city_id?: string | null
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
          order_id?: string | null
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
          city_id?: string | null
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
          order_id?: string | null
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
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          avatar_url: string | null
          city_id: string | null
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
          city_id?: string | null
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
          city_id?: string | null
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
      financial_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
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
      order_items: {
        Row: {
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city_id: string | null
          company_id: string
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          total: number
          updated_at: string | null
        }
        Insert: {
          city_id?: string | null
          company_id: string
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          city_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
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
      wallets: {
        Row: {
          balance: number
          id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          pix_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
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
      get_delivery_price: {
        Args: { lat: number; lng: number }
        Returns: number
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
      process_delivery_payment: {
        Args: { p_delivery_id: string }
        Returns: undefined
      }
      process_payment_split: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
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
        | "broadcasted"
        | "accepted"
        | "collecting"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "returned"
      driver_status: "pending" | "active" | "rejected" | "suspended"
      occurrence_type: "delay" | "damage" | "absence" | "other"
      payment_method_type: "pix" | "card" | "cash"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      transaction_type: "earning" | "fee" | "withdrawal" | "refund"
      vehicle_type: "motorcycle" | "bicycle" | "car" | "van" | "truck"
      withdrawal_status: "pending" | "approved" | "rejected" | "completed"
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
        "broadcasted",
        "accepted",
        "collecting",
        "in_transit",
        "delivered",
        "cancelled",
        "returned",
      ],
      driver_status: ["pending", "active", "rejected", "suspended"],
      occurrence_type: ["delay", "damage", "absence", "other"],
      payment_method_type: ["pix", "card", "cash"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      transaction_type: ["earning", "fee", "withdrawal", "refund"],
      vehicle_type: ["motorcycle", "bicycle", "car", "van", "truck"],
      withdrawal_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
