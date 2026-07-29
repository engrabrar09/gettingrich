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
      ai_analyses: {
        Row: {
          confidence_pct: number | null
          created_at: string
          error: string | null
          horizon: string | null
          id: string
          key_risks: Json | null
          latency_ms: number | null
          model: string
          provider: string
          run_id: string
          status: string
          summary: string | null
          user_id: string
          verdict: string | null
        }
        Insert: {
          confidence_pct?: number | null
          created_at?: string
          error?: string | null
          horizon?: string | null
          id?: string
          key_risks?: Json | null
          latency_ms?: number | null
          model: string
          provider: string
          run_id: string
          status: string
          summary?: string | null
          user_id: string
          verdict?: string | null
        }
        Update: {
          confidence_pct?: number | null
          created_at?: string
          error?: string | null
          horizon?: string | null
          id?: string
          key_risks?: Json | null
          latency_ms?: number | null
          model?: string
          provider?: string
          run_id?: string
          status?: string
          summary?: string | null
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          asset_id: string | null
          cooldown_minutes: number
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          params: Json
          portfolio_id: string | null
          previous_value: number | null
          rule_type: string
          scope: string
          updated_at: string
          user_id: string
          watchlist_id: string | null
        }
        Insert: {
          asset_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          params?: Json
          portfolio_id?: string | null
          previous_value?: number | null
          rule_type: string
          scope: string
          updated_at?: string
          user_id: string
          watchlist_id?: string | null
        }
        Update: {
          asset_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          params?: Json
          portfolio_id?: string | null
          previous_value?: number | null
          rule_type?: string
          scope?: string
          updated_at?: string
          user_id?: string
          watchlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          input_snapshot: Json
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          input_snapshot: Json
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          input_snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: string
          created_at: string
          currency: string
          exchange: string | null
          id: string
          is_active: boolean
          name: string | null
          provider_key: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          asset_class: string
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          provider_key?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          provider_key?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          asset_id: string
          computed_at: string
          date: string
          levels: Json | null
          monte_carlo: Json | null
          regression: Json | null
          seasonality: Json | null
        }
        Insert: {
          asset_id: string
          computed_at?: string
          date: string
          levels?: Json | null
          monte_carlo?: Json | null
          regression?: Json | null
          seasonality?: Json | null
        }
        Update: {
          asset_id?: string
          computed_at?: string
          date?: string
          levels?: Json | null
          monte_carlo?: Json | null
          regression?: Json | null
          seasonality?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      fundamentals: {
        Row: {
          as_of: string
          asset_id: string
          beta: number | null
          current_ratio: number | null
          debt_to_equity: number | null
          dividend_growth_5y: number | null
          dividend_per_share: number | null
          dividend_yield: number | null
          eps: number | null
          payout_ratio: number | null
          pb_ratio: number | null
          pe_ratio: number | null
          peg_ratio: number | null
          profit_margin: number | null
          roa: number | null
          roe: number | null
        }
        Insert: {
          as_of?: string
          asset_id: string
          beta?: number | null
          current_ratio?: number | null
          debt_to_equity?: number | null
          dividend_growth_5y?: number | null
          dividend_per_share?: number | null
          dividend_yield?: number | null
          eps?: number | null
          payout_ratio?: number | null
          pb_ratio?: number | null
          pe_ratio?: number | null
          peg_ratio?: number | null
          profit_margin?: number | null
          roa?: number | null
          roe?: number | null
        }
        Update: {
          as_of?: string
          asset_id?: string
          beta?: number | null
          current_ratio?: number | null
          debt_to_equity?: number | null
          dividend_growth_5y?: number | null
          dividend_per_share?: number | null
          dividend_yield?: number | null
          eps?: number | null
          payout_ratio?: number | null
          pb_ratio?: number | null
          pe_ratio?: number | null
          peg_ratio?: number | null
          profit_margin?: number | null
          roa?: number | null
          roe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fundamentals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          asset_id: string
          avg_cost: number
          created_at: string
          id: string
          notes: string | null
          portfolio_id: string
          purchase_date: string | null
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          avg_cost: number
          created_at?: string
          id?: string
          notes?: string | null
          portfolio_id: string
          purchase_date?: string | null
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          avg_cost?: number
          created_at?: string
          id?: string
          notes?: string | null
          portfolio_id?: string
          purchase_date?: string | null
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          asset_id: string
          atr_14: number | null
          atr_pct: number | null
          bb_bandwidth: number | null
          bb_lower: number | null
          bb_middle: number | null
          bb_upper: number | null
          close: number
          computed_at: string
          date: string
          ema_12: number | null
          ema_26: number | null
          extra: Json
          high_52w: number | null
          low_52w: number | null
          ma_cross: string | null
          macd: number | null
          macd_histogram: number | null
          macd_signal: number | null
          range_position_pct: number | null
          roc_12: number | null
          rsi_14: number | null
          sma_20: number | null
          sma_200: number | null
          sma_50: number | null
          stoch_d: number | null
          stoch_k: number | null
          volume_ratio: number | null
          volume_sma_20: number | null
        }
        Insert: {
          asset_id: string
          atr_14?: number | null
          atr_pct?: number | null
          bb_bandwidth?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          close: number
          computed_at?: string
          date: string
          ema_12?: number | null
          ema_26?: number | null
          extra?: Json
          high_52w?: number | null
          low_52w?: number | null
          ma_cross?: string | null
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          range_position_pct?: number | null
          roc_12?: number | null
          rsi_14?: number | null
          sma_20?: number | null
          sma_200?: number | null
          sma_50?: number | null
          stoch_d?: number | null
          stoch_k?: number | null
          volume_ratio?: number | null
          volume_sma_20?: number | null
        }
        Update: {
          asset_id?: string
          atr_14?: number | null
          atr_pct?: number | null
          bb_bandwidth?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          close?: number
          computed_at?: string
          date?: string
          ema_12?: number | null
          ema_26?: number | null
          extra?: Json
          high_52w?: number | null
          low_52w?: number | null
          ma_cross?: string | null
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          range_position_pct?: number | null
          roc_12?: number | null
          rsi_14?: number | null
          sma_20?: number | null
          sma_200?: number | null
          sma_50?: number | null
          stoch_d?: number | null
          stoch_k?: number | null
          volume_ratio?: number | null
          volume_sma_20?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          asset_id: string | null
          created_at: string
          headline: string
          id: string
          published_at: string
          sentiment: number | null
          source: string | null
          summary: string | null
          url: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          headline: string
          id?: string
          published_at: string
          sentiment?: number | null
          source?: string | null
          summary?: string | null
          url: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          headline?: string
          id?: string
          published_at?: string
          sentiment?: number | null
          source?: string | null
          summary?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempted_at: string
          channel: string
          error: string | null
          id: string
          notification_id: string
          status: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          channel: string
          error?: string | null
          id?: string
          notification_id: string
          status: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          channel?: string
          error?: string | null
          id?: string
          notification_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_rule_id: string | null
          asset_id: string | null
          body: string
          category: string
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          alert_rule_id?: string | null
          asset_id?: string | null
          body: string
          category?: string
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          alert_rule_id?: string | null
          asset_id?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_currency: string
          country: string | null
          created_at: string
          display_name: string | null
          email_enabled: boolean
          id: string
          telegram_chat_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          email_enabled?: boolean
          id: string
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          email_enabled?: boolean
          id?: string
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
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
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_history: {
        Row: {
          asset_id: string
          close: number
          date: string
          high: number
          low: number
          open: number
          volume: number
        }
        Insert: {
          asset_id: string
          close: number
          date: string
          high: number
          low: number
          open: number
          volume?: number
        }
        Update: {
          asset_id?: string
          close?: number
          date?: string
          high?: number
          low?: number
          open?: number
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          asset_id: string
          change_pct: number | null
          fetched_at: string
          prev_close: number | null
          price: number
        }
        Insert: {
          asset_id: string
          change_pct?: number | null
          fetched_at?: string
          prev_close?: number | null
          price: number
        }
        Update: {
          asset_id?: string
          change_pct?: number | null
          fetched_at?: string
          prev_close?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          sort_order: number
          user_id: string
          watchlist_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id: string
          watchlist_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_settings: {
        Row: {
          default_alert_thresholds: Json
          enabled_channels: string[]
          news_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          refresh_interval_minutes: number
          updated_at: string
          user_id: string
          watchlist_id: string
        }
        Insert: {
          default_alert_thresholds?: Json
          enabled_channels?: string[]
          news_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          refresh_interval_minutes?: number
          updated_at?: string
          user_id: string
          watchlist_id: string
        }
        Update: {
          default_alert_thresholds?: Json
          enabled_channels?: string[]
          news_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          refresh_interval_minutes?: number
          updated_at?: string
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_settings_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: true
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
