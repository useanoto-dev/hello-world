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
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_used: boolean
          staff_id: string
          store_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_used?: boolean
          staff_id: string
          store_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean
          staff_id?: string
          store_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          module: string
          record_id: string | null
          staff_id: string | null
          staff_name: string | null
          staff_role: string | null
          store_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module: string
          record_id?: string | null
          staff_id?: string | null
          staff_name?: string | null
          staff_role?: string | null
          store_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string
          record_id?: string | null
          staff_id?: string | null
          staff_name?: string | null
          staff_role?: string | null
          store_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          store_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          store_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          store_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          allow_quantity_selector: boolean | null
          category_type: string | null
          created_at: string | null
          description: string | null
          display_mode: string | null
          display_order: number | null
          has_base_product: boolean | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          show_flavor_prices: boolean
          slug: string
          store_id: string
          use_sequential_flow: boolean | null
        }
        Insert: {
          allow_quantity_selector?: boolean | null
          category_type?: string | null
          created_at?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          has_base_product?: boolean | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          show_flavor_prices?: boolean
          slug: string
          store_id: string
          use_sequential_flow?: boolean | null
        }
        Update: {
          allow_quantity_selector?: boolean | null
          category_type?: string | null
          created_at?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          has_base_product?: boolean | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          show_flavor_prices?: boolean
          slug?: string
          store_id?: string
          use_sequential_flow?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      category_option_groups: {
        Row: {
          category_id: string
          created_at: string | null
          display_mode: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean
          is_required: boolean | null
          item_layout: string
          max_selections: number | null
          min_selections: number | null
          name: string
          selection_type: string
          show_item_images: boolean
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          display_mode?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          is_required?: boolean | null
          item_layout?: string
          max_selections?: number | null
          min_selections?: number | null
          name: string
          selection_type?: string
          show_item_images?: boolean
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          display_mode?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          is_required?: boolean | null
          item_layout?: string
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          selection_type?: string
          show_item_images?: boolean
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_option_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_option_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      category_option_items: {
        Row: {
          additional_price: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          group_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          promotion_end_at: string | null
          promotion_start_at: string | null
          promotional_price: number | null
          store_id: string
        }
        Insert: {
          additional_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          store_id: string
        }
        Update: {
          additional_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_option_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "category_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_option_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          customer_phone: string
          id: string
          order_id: string | null
          store_id: string
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_phone: string
          id?: string
          order_id?: string | null
          store_id: string
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_phone?: string
          id?: string
          order_id?: string | null
          store_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_customer: number | null
          min_order_value: number | null
          store_id: string
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_value?: number | null
          store_id: string
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_value?: number | null
          store_id?: string
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points: {
        Row: {
          created_at: string | null
          customer_cpf: string | null
          customer_name: string
          customer_phone: string
          id: string
          lifetime_points: number
          store_id: string
          tier: string
          total_points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          lifetime_points?: number
          store_id: string
          tier?: string
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          lifetime_points?: number
          store_id?: string
          tier?: string
          total_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string | null
          id: string
          last_order_at: string | null
          name: string
          notes: string | null
          phone: string
          store_id: string
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          notes?: string | null
          phone: string
          store_id: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          store_id?: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_areas: {
        Row: {
          created_at: string | null
          display_order: number | null
          estimated_time: number | null
          fee: number
          id: string
          is_active: boolean | null
          min_order_value: number | null
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          estimated_time?: number | null
          fee?: number
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          estimated_time?: number | null
          fee?: number
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_areas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          store_id: string
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          store_id: string
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          payment_method: string | null
          recurring_day: number | null
          reference_date: string
          store_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recurring_day?: number | null
          reference_date?: string
          store_id: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          payment_method?: string | null
          recurring_day?: number | null
          reference_date?: string
          store_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_whatsapp_pedido: {
        Row: {
          data_envio: string
          enviado_por: string
          id: string
          mensagem: string
          pedido_id: string
          status_pedido: string
          telefone: string
        }
        Insert: {
          data_envio?: string
          enviado_por?: string
          id?: string
          mensagem: string
          pedido_id: string
          status_pedido: string
          telefone: string
        }
        Update: {
          data_envio?: string
          enviado_por?: string
          id?: string
          mensagem?: string
          pedido_id?: string
          status_pedido?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_whatsapp_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number
          order_id: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock: number
          order_id?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          order_id?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          store_id?: string
        }
        Relationships: []
      }
      inventory_products: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_stock_alert: number | null
          name: string
          price: number
          promotion_end_at: string | null
          promotion_start_at: string | null
          promotional_price: number | null
          stock_quantity: number
          store_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_alert?: number | null
          name: string
          price?: number
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          stock_quantity?: number
          store_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_alert?: number | null
          name?: string
          price?: number
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          stock_quantity?: number
          store_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          max_redemptions: number | null
          name: string
          points_required: number
          redemptions_count: number | null
          reward_type: string
          reward_value: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          max_redemptions?: number | null
          name: string
          points_required: number
          redemptions_count?: number | null
          reward_type?: string
          reward_value?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          max_redemptions?: number | null
          name?: string
          points_required?: number
          redemptions_count?: number | null
          reward_type?: string
          reward_value?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          min_order_for_points: number | null
          points_per_currency: number
          store_id: string
          tier_bronze_bonus: number
          tier_bronze_min: number
          tier_gold_bonus: number
          tier_gold_min: number
          tier_silver_bonus: number
          tier_silver_min: number
          tiers_enabled: boolean
          updated_at: string | null
          welcome_bonus: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          min_order_for_points?: number | null
          points_per_currency?: number
          store_id: string
          tier_bronze_bonus?: number
          tier_bronze_min?: number
          tier_gold_bonus?: number
          tier_gold_min?: number
          tier_silver_bonus?: number
          tier_silver_min?: number
          tiers_enabled?: boolean
          updated_at?: string | null
          welcome_bonus?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          min_order_for_points?: number | null
          points_per_currency?: number
          store_id?: string
          tier_bronze_bonus?: number
          tier_bronze_min?: number
          tier_gold_bonus?: number
          tier_gold_min?: number
          tier_silver_bonus?: number
          tier_silver_min?: number
          tiers_enabled?: boolean
          updated_at?: string | null
          welcome_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_automaticas_whatsapp: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          mensagem: string
          restaurant_id: string
          status_pedido: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem: string
          restaurant_id: string
          status_pedido: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          mensagem?: string
          restaurant_id?: string
          status_pedido?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_automaticas_whatsapp_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number | null
          discount: number | null
          id: string
          items: Json
          notes: string | null
          order_number: number
          order_source: string | null
          order_type: string
          paid: boolean | null
          payment_change: number | null
          payment_method: string | null
          staff_id: string | null
          status: string | null
          store_id: string
          stripe_payment_intent_id: string | null
          subtotal: number
          table_id: string | null
          total: number
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          order_source?: string | null
          order_type: string
          paid?: boolean | null
          payment_change?: number | null
          payment_method?: string | null
          staff_id?: string | null
          status?: string | null
          store_id: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          order_source?: string | null
          order_type?: string
          paid?: boolean | null
          payment_change?: number | null
          payment_method?: string | null
          staff_id?: string | null
          status?: string | null
          store_id?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_type: string
          id: string
          is_active: boolean | null
          name: string
          requires_change: boolean | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          requires_change?: boolean | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          requires_change?: boolean | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_dough_prices: {
        Row: {
          created_at: string
          dough_id: string
          id: string
          is_available: boolean
          price: number
          size_id: string
        }
        Insert: {
          created_at?: string
          dough_id: string
          id?: string
          is_available?: boolean
          price?: number
          size_id: string
        }
        Update: {
          created_at?: string
          dough_id?: string
          id?: string
          is_available?: boolean
          price?: number
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_dough_prices_dough_id_fkey"
            columns: ["dough_id"]
            isOneToOne: false
            referencedRelation: "pizza_doughs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_dough_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "pizza_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_doughs: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_doughs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_doughs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_edge_prices: {
        Row: {
          created_at: string
          edge_id: string
          id: string
          is_available: boolean
          price: number
          size_id: string
        }
        Insert: {
          created_at?: string
          edge_id: string
          id?: string
          is_available?: boolean
          price?: number
          size_id: string
        }
        Update: {
          created_at?: string
          edge_id?: string
          id?: string
          is_available?: boolean
          price?: number
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_edge_prices_edge_id_fkey"
            columns: ["edge_id"]
            isOneToOne: false
            referencedRelation: "pizza_edges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_edge_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "pizza_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_edges: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_edges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_edges_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_flavor_prices: {
        Row: {
          created_at: string
          flavor_id: string
          id: string
          is_available: boolean
          price: number
          size_id: string
          surcharge: number
        }
        Insert: {
          created_at?: string
          flavor_id: string
          id?: string
          is_available?: boolean
          price?: number
          size_id: string
          surcharge?: number
        }
        Update: {
          created_at?: string
          flavor_id?: string
          id?: string
          is_available?: boolean
          price?: number
          size_id?: string
          surcharge?: number
        }
        Relationships: [
          {
            foreignKeyName: "pizza_flavor_prices_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "pizza_flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_flavor_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "pizza_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_flavors: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          flavor_type: string
          id: string
          image_url: string | null
          is_active: boolean
          is_premium: boolean
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          flavor_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          flavor_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_flavors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_flavors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_flow_steps: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_enabled: boolean
          next_step_id: string | null
          position_x: number | null
          position_y: number | null
          step_order: number
          step_type: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          next_step_id?: string | null
          position_x?: number | null
          position_y?: number | null
          step_order?: number
          step_type: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          next_step_id?: string | null
          position_x?: number | null
          position_y?: number | null
          step_order?: number
          step_type?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_flow_steps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_flow_steps_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pizza_sizes: {
        Row: {
          base_price: number
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          max_flavors: number
          min_flavors: number
          name: string
          price_model: string
          slices: number
          store_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_flavors?: number
          min_flavors?: number
          name: string
          price_model?: string
          slices?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_flavors?: number
          min_flavors?: number
          name?: string
          price_model?: string
          slices?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pizza_sizes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pizza_sizes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          created_at: string | null
          customer_cpf: string | null
          customer_phone: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          reward_id: string | null
          store_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_phone: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          reward_id?: string | null
          store_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_phone?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          reward_id?: string | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          order_id: string | null
          order_number: number | null
          printer_id: string
          printer_name: string | null
          printnode_job_id: number | null
          retry_count: number | null
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          order_id?: string | null
          order_number?: number | null
          printer_id: string
          printer_name?: string | null
          printnode_job_id?: number | null
          retry_count?: number | null
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          order_id?: string | null
          order_number?: number | null
          printer_id?: string
          printer_name?: string | null
          printnode_job_id?: number | null
          retry_count?: number | null
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          item_layout: string | null
          max_selections: number | null
          min_selections: number | null
          name: string
          product_id: string
          selection_type: string
          show_item_images: boolean | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_layout?: string | null
          max_selections?: number | null
          min_selections?: number | null
          name: string
          product_id: string
          selection_type?: string
          show_item_images?: boolean | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          item_layout?: string | null
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          product_id?: string
          selection_type?: string
          show_item_images?: boolean | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_items: {
        Row: {
          additional_price: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          group_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          promotion_end_at: string | null
          promotion_start_at: string | null
          promotional_price: number | null
          store_id: string
        }
        Insert: {
          additional_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          store_id: string
        }
        Update: {
          additional_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          promotion_end_at?: string | null
          promotion_start_at?: string | null
          promotional_price?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          display_mode: string | null
          display_order: number | null
          has_stock_control: boolean | null
          id: string
          image_url: string | null
          images: Json | null
          is_available: boolean | null
          is_featured: boolean | null
          min_stock_alert: number | null
          name: string
          price: number
          promotional_price: number | null
          stock_quantity: number | null
          store_id: string
          unit: string | null
          updated_at: string | null
          variations: Json | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          has_stock_control?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_featured?: boolean | null
          min_stock_alert?: number | null
          name: string
          price: number
          promotional_price?: number | null
          stock_quantity?: number | null
          store_id: string
          unit?: string | null
          updated_at?: string | null
          variations?: Json | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          has_stock_control?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_featured?: boolean | null
          min_stock_alert?: number | null
          name?: string
          price?: number
          promotional_price?: number | null
          stock_quantity?: number | null
          store_id?: string
          unit?: string | null
          updated_at?: string | null
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cep: string | null
          city: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_owner: boolean | null
          phone: string | null
          state: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_owner?: boolean | null
          phone?: string | null
          state?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_owner?: boolean | null
          phone?: string | null
          state?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          order_id: string | null
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          order_id?: string | null
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          order_id?: string | null
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          feedback: string | null
          id: string
          rating: number
          response_at: string | null
          store_id: string
          store_response: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          feedback?: string | null
          id?: string
          rating: number
          response_at?: string | null
          store_id: string
          store_response?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          feedback?: string | null
          id?: string
          rating?: number
          response_at?: string | null
          store_id?: string
          store_response?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          can_apply_discounts: boolean
          can_cancel_orders: boolean
          can_close_cashier: boolean
          can_finalize_sales: boolean
          can_open_cashier: boolean
          can_view_reports: boolean
          created_at: string
          id: string
          staff_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          can_apply_discounts?: boolean
          can_cancel_orders?: boolean
          can_close_cashier?: boolean
          can_finalize_sales?: boolean
          can_open_cashier?: boolean
          can_view_reports?: boolean
          created_at?: string
          id?: string
          staff_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          can_apply_discounts?: boolean
          can_cancel_orders?: boolean
          can_close_cashier?: boolean
          can_finalize_sales?: boolean
          can_open_cashier?: boolean
          can_view_reports?: boolean
          created_at?: string
          id?: string
          staff_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_addon_prices: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          is_available: boolean
          price: number
          size_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          price?: number
          size_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          price?: number
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_addon_prices_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "standard_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_addon_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "standard_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_addons: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_required: boolean
          max_quantity: number
          name: string
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_required?: boolean
          max_quantity?: number
          name: string
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_required?: boolean
          max_quantity?: number
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_addons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_addons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_item_prices: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          item_id: string
          price: number
          size_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          item_id: string
          price?: number
          size_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          item_id?: string
          price?: number
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_item_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "standard_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_item_prices_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "standard_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_premium: boolean
          item_type: string
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
          item_type?: string
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_premium?: boolean
          item_type?: string
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_sizes: {
        Row: {
          base_price: number
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_sizes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standard_sizes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff: {
        Row: {
          cpf: string
          created_at: string
          created_by: string | null
          failed_login_attempts: number
          id: string
          is_active: boolean
          is_deleted: boolean
          last_login_at: string | null
          locked_until: string | null
          name: string
          password_hash: string | null
          role: string
          store_id: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          created_by?: string | null
          failed_login_attempts?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          name: string
          password_hash?: string | null
          role: string
          store_id: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          created_by?: string | null
          failed_login_attempts?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          name?: string
          password_hash?: string | null
          role?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "store_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          about_us: string | null
          address: string | null
          banner_url: string | null
          close_hour: number | null
          created_at: string | null
          delivery_fee: number | null
          estimated_delivery_time: number | null
          estimated_prep_time: number | null
          font_family: string | null
          google_maps_link: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_open_override: boolean | null
          logo_url: string | null
          min_order_value: number | null
          name: string
          onboarding_completed: boolean | null
          open_hour: number | null
          phone: string | null
          pix_key: string | null
          primary_color: string | null
          print_footer_message: string | null
          printer_width: string | null
          printnode_auto_print: boolean | null
          printnode_max_retries: number | null
          printnode_printer_id: string | null
          schedule: Json | null
          secondary_color: string | null
          sidebar_color: string | null
          slug: string
          uazapi_instance_name: string | null
          uazapi_instance_token: string | null
          updated_at: string | null
          use_comanda_mode: boolean | null
          whatsapp: string | null
          whatsapp_name: string | null
          whatsapp_number: string | null
          whatsapp_status: string | null
        }
        Insert: {
          about_us?: string | null
          address?: string | null
          banner_url?: string | null
          close_hour?: number | null
          created_at?: string | null
          delivery_fee?: number | null
          estimated_delivery_time?: number | null
          estimated_prep_time?: number | null
          font_family?: string | null
          google_maps_link?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_open_override?: boolean | null
          logo_url?: string | null
          min_order_value?: number | null
          name: string
          onboarding_completed?: boolean | null
          open_hour?: number | null
          phone?: string | null
          pix_key?: string | null
          primary_color?: string | null
          print_footer_message?: string | null
          printer_width?: string | null
          printnode_auto_print?: boolean | null
          printnode_max_retries?: number | null
          printnode_printer_id?: string | null
          schedule?: Json | null
          secondary_color?: string | null
          sidebar_color?: string | null
          slug: string
          uazapi_instance_name?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          use_comanda_mode?: boolean | null
          whatsapp?: string | null
          whatsapp_name?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          about_us?: string | null
          address?: string | null
          banner_url?: string | null
          close_hour?: number | null
          created_at?: string | null
          delivery_fee?: number | null
          estimated_delivery_time?: number | null
          estimated_prep_time?: number | null
          font_family?: string | null
          google_maps_link?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_open_override?: boolean | null
          logo_url?: string | null
          min_order_value?: number | null
          name?: string
          onboarding_completed?: boolean | null
          open_hour?: number | null
          phone?: string | null
          pix_key?: string | null
          primary_color?: string | null
          print_footer_message?: string | null
          printer_width?: string | null
          printnode_auto_print?: boolean | null
          printnode_max_retries?: number | null
          printnode_printer_id?: string | null
          schedule?: Json | null
          secondary_color?: string | null
          sidebar_color?: string | null
          slug?: string
          uazapi_instance_name?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          use_comanda_mode?: boolean | null
          whatsapp?: string | null
          whatsapp_name?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_method: string | null
          pix_code: string | null
          pix_expires_at: string | null
          pix_invoice_id: string | null
          pix_qr_code_url: string | null
          plan: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          store_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string | null
          pix_code?: string | null
          pix_expires_at?: string | null
          pix_invoice_id?: string | null
          pix_qr_code_url?: string | null
          plan?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          store_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string | null
          pix_code?: string | null
          pix_expires_at?: string | null
          pix_invoice_id?: string | null
          pix_qr_code_url?: string | null
          plan?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          store_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      table_reservations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          status: string
          store_id: string
          table_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date: string
          reservation_time: string
          status?: string
          store_id: string
          table_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          status?: string
          store_id?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_reservations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string | null
          number: string
          status: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          number: string
          status?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          number?: string
          status?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_modals: {
        Row: {
          button_color: string | null
          button_text: string | null
          content_type: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          max_products: number | null
          modal_type: string
          name: string
          primary_redirect_category_id: string | null
          secondary_button_text: string | null
          secondary_redirect_category_id: string | null
          show_quick_add: boolean
          store_id: string
          target_category_id: string | null
          title: string
          trigger_category_id: string | null
          updated_at: string
        }
        Insert: {
          button_color?: string | null
          button_text?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          max_products?: number | null
          modal_type?: string
          name: string
          primary_redirect_category_id?: string | null
          secondary_button_text?: string | null
          secondary_redirect_category_id?: string | null
          show_quick_add?: boolean
          store_id: string
          target_category_id?: string | null
          title?: string
          trigger_category_id?: string | null
          updated_at?: string
        }
        Update: {
          button_color?: string | null
          button_text?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          max_products?: number | null
          modal_type?: string
          name?: string
          primary_redirect_category_id?: string | null
          secondary_button_text?: string | null
          secondary_redirect_category_id?: string | null
          show_quick_add?: boolean
          store_id?: string
          target_category_id?: string | null
          title?: string
          trigger_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_modals_primary_redirect_category_id_fkey"
            columns: ["primary_redirect_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_modals_secondary_redirect_category_id_fkey"
            columns: ["secondary_redirect_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_modals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_modals_target_category_id_fkey"
            columns: ["target_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_modals_trigger_category_id_fkey"
            columns: ["trigger_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string | null
          customer_id: string
          customer_name: string
          customer_phone: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          customer_id: string
          customer_name: string
          customer_phone: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          filters: Json | null
          id: string
          image_url: string | null
          is_recurring: boolean | null
          message_content: string
          name: string
          recurring_days: number[] | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          store_id: string
          total_recipients: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          message_content: string
          name: string
          recurring_days?: number[] | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          store_id: string
          total_recipients?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          message_content?: string
          name?: string
          recurring_days?: number[] | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          store_id?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          instance_token: string | null
          last_connected_at: string | null
          phone_connected: string | null
          qr_code: string | null
          qr_code_expires_at: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          instance_token?: string | null
          last_connected_at?: string | null
          phone_connected?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          instance_token?: string | null
          last_connected_at?: string | null
          phone_connected?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          customer_id: string
          customer_phone: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string
          message_id: string | null
          message_type: string | null
          order_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          store_id: string
          template_key: string
        }
        Insert: {
          customer_id: string
          customer_phone: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          message_id?: string | null
          message_type?: string | null
          order_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          store_id: string
          template_key: string
        }
        Update: {
          customer_id?: string
          customer_phone?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          message_id?: string | null
          message_type?: string | null
          order_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          store_id?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          display_order: number | null
          emoji: string
          id: string
          is_active: boolean | null
          label: string
          message_template: string
          store_id: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          label: string
          message_template: string
          store_id: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          label?: string
          message_template?: string
          store_id?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_customer_tier: {
        Args: {
          p_bronze_min: number
          p_gold_min: number
          p_lifetime_points: number
          p_silver_min: number
        }
        Returns: string
      }
      generate_access_code: { Args: never; Returns: string }
      get_public_store_info: {
        Args: { p_slug: string }
        Returns: {
          about_us: string
          address: string
          banner_url: string
          delivery_fee: number
          estimated_delivery_time: number
          estimated_prep_time: number
          google_maps_link: string
          id: string
          instagram: string
          is_active: boolean
          logo_url: string
          min_order_value: number
          name: string
          phone: string
          primary_color: string
          schedule: Json
          secondary_color: string
          slug: string
          whatsapp: string
        }[]
      }
      get_safe_store_data: {
        Args: { p_store_id: string }
        Returns: {
          about_us: string
          address: string
          banner_url: string
          close_hour: number
          created_at: string
          delivery_fee: number
          font_family: string
          google_maps_link: string
          id: string
          instagram: string
          is_active: boolean
          is_open_override: boolean
          logo_url: string
          name: string
          onboarding_completed: boolean
          open_hour: number
          phone: string
          pix_key: string
          primary_color: string
          print_footer_message: string
          printer_width: string
          printnode_printer_id: string
          secondary_color: string
          sidebar_color: string
          slug: string
          uazapi_instance_name: string
          uazapi_instance_token: string
          updated_at: string
          whatsapp: string
          whatsapp_name: string
          whatsapp_number: string
          whatsapp_status: string
        }[]
      }
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_store_owner: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
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
      app_role: ["super_admin", "admin", "user"],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
    },
  },
} as const
