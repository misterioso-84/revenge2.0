export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      badge_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          started_at: string;
          user_id: string;
          week_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id: string;
          week_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id?: string;
          week_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badge_sessions_week_id_fkey";
            columns: ["week_id"];
            isOneToOne: false;
            referencedRelation: "badge_weeks";
            referencedColumns: ["id"];
          },
        ];
      };
      badge_weeks: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          ended_at: string | null;
          id: string;
          label: string;
          started_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          ended_at?: string | null;
          id?: string;
          label: string;
          started_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          ended_at?: string | null;
          id?: string;
          label?: string;
          started_at?: string;
        };
        Relationships: [];
      };
      citizens: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          membership: Database["public"]["Enums"]["membership_tier"];
          membership_since: string | null;
          nickname: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id?: string;
          membership?: Database["public"]["Enums"]["membership_tier"];
          membership_since?: string | null;
          nickname?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          membership?: Database["public"]["Enums"]["membership_tier"];
          membership_since?: string | null;
          nickname?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversion_resets: {
        Row: {
          citizen_id: string;
          created_by: string | null;
          direction: Database["public"]["Enums"]["conversion_direction"];
          id: string;
          night_id: string;
          reset_at: string;
        };
        Insert: {
          citizen_id: string;
          created_by?: string | null;
          direction: Database["public"]["Enums"]["conversion_direction"];
          id?: string;
          night_id: string;
          reset_at?: string;
        };
        Update: {
          citizen_id?: string;
          created_by?: string | null;
          direction?: Database["public"]["Enums"]["conversion_direction"];
          id?: string;
          night_id?: string;
          reset_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversion_resets_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversion_resets_night_id_fkey";
            columns: ["night_id"];
            isOneToOne: false;
            referencedRelation: "nights";
            referencedColumns: ["id"];
          },
        ];
      };
      conversion_settings: {
        Row: {
          id: boolean;
          max_dobloni_per_day: number;
          max_eur_per_day: number;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          max_dobloni_per_day?: number;
          max_eur_per_day?: number;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          max_dobloni_per_day?: number;
          max_eur_per_day?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversions: {
        Row: {
          citizen_id: string;
          created_at: string;
          created_by: string | null;
          direction: Database["public"]["Enums"]["conversion_direction"];
          dobloni_amount: number;
          eur_amount: number;
          id: string;
          input_amount: number;
          night_id: string;
        };
        Insert: {
          citizen_id: string;
          created_at?: string;
          created_by?: string | null;
          direction: Database["public"]["Enums"]["conversion_direction"];
          dobloni_amount: number;
          eur_amount: number;
          id?: string;
          input_amount: number;
          night_id: string;
        };
        Update: {
          citizen_id?: string;
          created_at?: string;
          created_by?: string | null;
          direction?: Database["public"]["Enums"]["conversion_direction"];
          dobloni_amount?: number;
          eur_amount?: number;
          id?: string;
          input_amount?: number;
          night_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversions_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversions_night_id_fkey";
            columns: ["night_id"];
            isOneToOne: false;
            referencedRelation: "nights";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          permissions: string[];
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          permissions?: string[];
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          permissions?: string[];
        };
        Relationships: [];
      };
      horses: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sponsor: string | null;
          stable_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sponsor?: string | null;
          stable_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sponsor?: string | null;
          stable_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "horses_stable_id_fkey";
            columns: ["stable_id"];
            isOneToOne: false;
            referencedRelation: "stables";
            referencedColumns: ["id"];
          },
        ];
      };
      night_items: {
        Row: {
          citizen_id: string;
          id: string;
          night_id: string;
          qty: number;
          service_id: string | null;
          service_name: string;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          citizen_id: string;
          id?: string;
          night_id: string;
          qty?: number;
          service_id?: string | null;
          service_name: string;
          subtotal: number;
          unit_price: number;
        };
        Update: {
          citizen_id?: string;
          id?: string;
          night_id?: string;
          qty?: number;
          service_id?: string | null;
          service_name?: string;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "night_items_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "night_items_night_id_fkey";
            columns: ["night_id"];
            isOneToOne: false;
            referencedRelation: "nights";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "night_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      nights: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          night_date: string;
          notes: string | null;
          title: string | null;
          total: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          night_date?: string;
          notes?: string | null;
          title?: string | null;
          total?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          night_date?: string;
          notes?: string | null;
          title?: string | null;
          total?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      safe_boxes: {
        Row: {
          activated_at: string | null;
          active: boolean;
          box_number: number;
          citizen_id: string | null;
          expires_at: string | null;
          id: string;
          notes: string | null;
        };
        Insert: {
          activated_at?: string | null;
          active?: boolean;
          box_number: number;
          citizen_id?: string | null;
          expires_at?: string | null;
          id?: string;
          notes?: string | null;
        };
        Update: {
          activated_at?: string | null;
          active?: boolean;
          box_number?: number;
          citizen_id?: string | null;
          expires_at?: string | null;
          id?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "safe_boxes_citizen_id_fkey";
            columns: ["citizen_id"];
            isOneToOne: false;
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          billing: Database["public"]["Enums"]["service_billing"];
          category_id: string | null;
          created_at: string;
          id: string;
          name: string;
          price: number;
        };
        Insert: {
          active?: boolean;
          billing?: Database["public"]["Enums"]["service_billing"];
          category_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          price: number;
        };
        Update: {
          active?: boolean;
          billing?: Database["public"]["Enums"]["service_billing"];
          category_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      stables: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_citizen_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_citizen_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_citizen_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stables_owner_citizen_id_fkey";
            columns: ["owner_citizen_id"];
            isOneToOne: false;
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
        ];
      };
      user_custom_roles: {
        Row: {
          custom_role_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          custom_role_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          custom_role_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_custom_role_id_fkey";
            columns: ["custom_role_id"];
            isOneToOne: false;
            referencedRelation: "custom_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      conversion_usage: {
        Args: {
          _citizen: string;
          _direction: Database["public"]["Enums"]["conversion_direction"];
          _night: string;
        };
        Returns: number;
      };
      has_permission: {
        Args: { _perm: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      perform_conversion: {
        Args: {
          _citizen: string;
          _direction: Database["public"]["Enums"]["conversion_direction"];
          _input: number;
          _night: string;
        };
        Returns: {
          citizen_id: string;
          created_at: string;
          created_by: string | null;
          direction: Database["public"]["Enums"]["conversion_direction"];
          dobloni_amount: number;
          eur_amount: number;
          id: string;
          input_amount: number;
          night_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      user_permissions: { Args: { _user_id: string }; Returns: string[] };
    };
    Enums: {
      app_role: "admin" | "staff";
      conversion_direction: "cash_to_dobloni" | "dobloni_to_cash";
      membership_tier: "standard" | "exclusive" | "elite" | "vip";
      service_billing: "per_night" | "one_time" | "recurring";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      conversion_direction: ["cash_to_dobloni", "dobloni_to_cash"],
      membership_tier: ["standard", "exclusive", "elite", "vip"],
      service_billing: ["per_night", "one_time", "recurring"],
    },
  },
} as const;
