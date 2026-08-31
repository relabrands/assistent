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
      client_access: {
        Row: {
          client_id: string
          created_at: string
          granted_by: string
          id: string
          role: Database["public"]["Enums"]["client_access_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          granted_by: string
          id?: string
          role?: Database["public"]["Enums"]["client_access_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          role?: Database["public"]["Enums"]["client_access_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          project_id: string
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_youtube: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          brand_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          project_id: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          brand_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          project_id?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          author_id: string
          comment: string
          content_id: string
          created_at: string
          id: string
          is_approval_request: boolean
          is_change_request: boolean
        }
        Insert: {
          author_id: string
          comment: string
          content_id: string
          created_at?: string
          id?: string
          is_approval_request?: boolean
          is_change_request?: boolean
        }
        Update: {
          author_id?: string
          comment?: string
          content_id?: string
          created_at?: string
          id?: string
          is_approval_request?: boolean
          is_change_request?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_custom_fields: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_custom_fields_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_custom_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_custom_values: {
        Row: {
          content_id: string
          created_at: string
          field_id: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          content_id: string
          created_at?: string
          field_id: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          content_id?: string
          created_at?: string
          field_id?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_custom_values_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_custom_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "content_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          client_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          copy: string | null
          created_at: string
          created_by: string
          cta: string | null
          file_urls: string[] | null
          hashtags: string[] | null
          id: string
          link: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          project_id: string
          published_date: string | null
          reference_urls: string[] | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client_id: string
          content_type?: Database["public"]["Enums"]["content_type"]
          copy?: string | null
          created_at?: string
          created_by: string
          cta?: string | null
          file_urls?: string[] | null
          hashtags?: string[] | null
          id?: string
          link?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          project_id: string
          published_date?: string | null
          reference_urls?: string[] | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          client_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          copy?: string | null
          created_at?: string
          created_by?: string
          cta?: string | null
          file_urls?: string[] | null
          hashtags?: string[] | null
          id?: string
          link?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          project_id?: string
          published_date?: string | null
          reference_urls?: string[] | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      member_project_assignments: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_project_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_platforms: {
        Row: {
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_platforms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          allows_client_access: boolean
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          sector: Database["public"]["Enums"]["sector_type"] | null
          updated_at: string
          uses_clients: boolean
          uses_content_calendar: boolean
        }
        Insert: {
          allows_client_access?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          sector?: Database["public"]["Enums"]["sector_type"] | null
          updated_at?: string
          uses_clients?: boolean
          uses_content_calendar?: boolean
        }
        Update: {
          allows_client_access?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          sector?: Database["public"]["Enums"]["sector_type"] | null
          updated_at?: string
          uses_clients?: boolean
          uses_content_calendar?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_variations: {
        Row: {
          color: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          size: string | null
          sku: string | null
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          cost: number
          cost_currency: string
          created_at: string
          exchange_rate: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          price: number
          provider: string | null
          purchase_date: string | null
          quantity_purchased: number
          sale_currency: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          cost?: number
          cost_currency?: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          price?: number
          provider?: string | null
          purchase_date?: string | null
          quantity_purchased?: number
          sale_currency?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          cost?: number
          cost_currency?: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          price?: number
          provider?: string | null
          purchase_date?: string | null
          quantity_purchased?: number
          sale_currency?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_purchases: {
        Row: {
          cost_currency: string
          created_at: string
          exchange_rate: number | null
          id: string
          notes: string | null
          product_id: string
          provider: string | null
          purchase_date: string | null
          quantity: number
          shipping_cost: number
          unit_cost: number
          user_id: string
          variation_id: string | null
        }
        Insert: {
          cost_currency?: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          product_id: string
          provider?: string | null
          purchase_date?: string | null
          quantity?: number
          shipping_cost?: number
          unit_cost?: number
          user_id: string
          variation_id?: string | null
        }
        Update: {
          cost_currency?: string
          created_at?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          provider?: string | null
          purchase_date?: string | null
          quantity?: number
          shipping_cost?: number
          unit_cost?: number
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchases_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "store_product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sales: {
        Row: {
          client_contact: string | null
          client_name: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          product_id: string
          quantity: number
          sale_date: string
          status: Database["public"]["Enums"]["sale_status"]
          unit_price: number
          user_id: string
          variation_id: string | null
        }
        Insert: {
          client_contact?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          product_id: string
          quantity?: number
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          unit_price?: number
          user_id: string
          variation_id?: string | null
        }
        Update: {
          client_contact?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          product_id?: string
          quantity?: number
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          unit_price?: number
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sales_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "store_product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_costs: {
        Row: {
          cost: number
          cost_currency: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          provider: string | null
          shipping_date: string | null
          shipping_type: string
          status: Database["public"]["Enums"]["shipping_status"]
          user_id: string
        }
        Insert: {
          cost?: number
          cost_currency?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          provider?: string | null
          shipping_date?: string | null
          shipping_type?: string
          status?: Database["public"]["Enums"]["shipping_status"]
          user_id: string
        }
        Update: {
          cost?: number
          cost_currency?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          provider?: string | null
          shipping_date?: string | null
          shipping_type?: string
          status?: Database["public"]["Enums"]["shipping_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shipping_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          area: Database["public"]["Enums"]["task_area"]
          assigned_to: string | null
          client: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          life_area: Database["public"]["Enums"]["life_area"] | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence_parent_id: string | null
          recurrence_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["task_area"]
          assigned_to?: string | null
          client?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          life_area?: Database["public"]["Enums"]["life_area"] | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["task_area"]
          assigned_to?: string | null
          client?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          life_area?: Database["public"]["Enums"]["life_area"] | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_circles: {
        Row: {
          bot_phone_number: string | null
          connected_at: string | null
          created_at: string
          created_by: string
          id: string
          invite_link: string | null
          member_count: number | null
          name: string
          status: string
          updated_at: string
          whatsapp_group_id: string | null
          workspace_id: string
        }
        Insert: {
          bot_phone_number?: string | null
          connected_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          invite_link?: string | null
          member_count?: number | null
          name: string
          status?: string
          updated_at?: string
          whatsapp_group_id?: string | null
          workspace_id: string
        }
        Update: {
          bot_phone_number?: string | null
          connected_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_link?: string | null
          member_count?: number | null
          name?: string
          status?: string
          updated_at?: string
          whatsapp_group_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_circles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          circle_id: string
          content: string
          id: string
          is_task_candidate: boolean | null
          processed_at: string | null
          received_at: string
          sender_name: string | null
          sender_phone: string | null
          task_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          circle_id: string
          content: string
          id?: string
          is_task_candidate?: boolean | null
          processed_at?: string | null
          received_at?: string
          sender_name?: string | null
          sender_phone?: string | null
          task_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          circle_id?: string
          content?: string
          id?: string
          is_task_candidate?: boolean | null
          processed_at?: string | null
          received_at?: string
          sender_name?: string | null
          sender_phone?: string | null
          task_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_projects: {
        Row: {
          created_at: string
          id: string
          project_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_requests: {
        Row: {
          assigned_workspace_id: string | null
          created_at: string
          id: string
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_workspace_id?: string | null
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_workspace_id?: string | null
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_requests_assigned_workspace_id_fkey"
            columns: ["assigned_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_profile_id: { Args: never; Returns: string }
      get_user_client_ids: { Args: { _user_id: string }; Returns: string[] }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "collaborator" | "client" | "designer"
      client_access_role: "viewer" | "approver"
      content_status:
        | "draft"
        | "pending_review"
        | "in_review"
        | "approved"
        | "requires_changes"
        | "scheduled"
        | "published"
      content_type:
        | "post"
        | "story"
        | "reel"
        | "video"
        | "ad"
        | "event"
        | "carousel"
        | "other"
      life_area: "trabajo" | "personal" | "salud" | "aprendizaje" | "finanzas"
      payment_method:
        | "efectivo"
        | "transferencia"
        | "tarjeta"
        | "paypal"
        | "otro"
      platform_type:
        | "instagram"
        | "facebook"
        | "tiktok"
        | "linkedin"
        | "youtube"
        | "twitter"
        | "pinterest"
        | "other"
      product_category:
        | "pulseras"
        | "accesorios"
        | "ropa"
        | "tecnologia"
        | "otros"
      product_status: "activo" | "agotado" | "descontinuado"
      sale_status: "pagada" | "pendiente" | "cancelada"
      sector_type:
        | "fintech"
        | "healthtech"
        | "edtech"
        | "marketing"
        | "ecommerce"
        | "saas"
        | "proptech"
        | "foodtech"
        | "other"
      shipping_status: "pagado" | "pendiente"
      task_area: "Personal" | "RELA" | "Nomi" | "DOKTAP" | "Venture Social"
      task_priority: "high" | "medium" | "low"
      task_status: "inbox" | "week" | "risk" | "completed"
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
      app_role: ["admin", "collaborator", "client", "designer"],
      client_access_role: ["viewer", "approver"],
      content_status: [
        "draft",
        "pending_review",
        "in_review",
        "approved",
        "requires_changes",
        "scheduled",
        "published",
      ],
      content_type: [
        "post",
        "story",
        "reel",
        "video",
        "ad",
        "event",
        "carousel",
        "other",
      ],
      life_area: ["trabajo", "personal", "salud", "aprendizaje", "finanzas"],
      payment_method: [
        "efectivo",
        "transferencia",
        "tarjeta",
        "paypal",
        "otro",
      ],
      platform_type: [
        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "youtube",
        "twitter",
        "pinterest",
        "other",
      ],
      product_category: [
        "pulseras",
        "accesorios",
        "ropa",
        "tecnologia",
        "otros",
      ],
      product_status: ["activo", "agotado", "descontinuado"],
      sale_status: ["pagada", "pendiente", "cancelada"],
      sector_type: [
        "fintech",
        "healthtech",
        "edtech",
        "marketing",
        "ecommerce",
        "saas",
        "proptech",
        "foodtech",
        "other",
      ],
      shipping_status: ["pagado", "pendiente"],
      task_area: ["Personal", "RELA", "Nomi", "DOKTAP", "Venture Social"],
      task_priority: ["high", "medium", "low"],
      task_status: ["inbox", "week", "risk", "completed"],
    },
  },
} as const
