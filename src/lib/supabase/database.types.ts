export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: string;
          source: string | null;
          link: string | null;
          read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          type?: string;
          source?: string | null;
          link?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          type?: string;
          source?: string | null;
          link?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          user_id: string;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          notification_id?: string;
          user_id?: string;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_events_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          file_id: string | null;
          file_name: string | null;
          status: string;
          progress: number;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          file_id?: string | null;
          file_name?: string | null;
          status?: string;
          progress?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          file_id?: string | null;
          file_name?: string | null;
          status?: string;
          progress?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: string;
          project_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: string;
          project_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          project_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          sender_type: string;
          body: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          sender_type?: string;
          body: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string | null;
          sender_type?: string;
          body?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      service_api_keys: {
        Row: {
          id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          service_name: string;
          allowed_sources: string[];
          scopes: string[];
          active: boolean;
          last_used_at: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          service_name: string;
          allowed_sources?: string[];
          scopes?: string[];
          active?: boolean;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          key_hash?: string;
          key_prefix?: string;
          service_name?: string;
          allowed_sources?: string[];
          scopes?: string[];
          active?: boolean;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          service_name: string;
          source: string;
          event_type: string;
          user_id: string | null;
          project_id: string | null;
          task_id: string | null;
          conversation_id: string | null;
          payload: Json;
          status: string;
          error_message: string | null;
          idempotency_key: string | null;
          received_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          service_name: string;
          source: string;
          event_type: string;
          user_id?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          conversation_id?: string | null;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          idempotency_key?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          service_name?: string;
          source?: string;
          event_type?: string;
          user_id?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          conversation_id?: string | null;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          idempotency_key?: string | null;
          received_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      webhook_event_logs: {
        Row: {
          id: string;
          webhook_event_id: string;
          level: string;
          message: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_event_id: string;
          level?: string;
          message: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_event_id?: string;
          level?: string;
          message?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_event_logs_webhook_event_id_fkey";
            columns: ["webhook_event_id"];
            isOneToOne: false;
            referencedRelation: "webhook_events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          channel: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          channel: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          channel?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preference_defaults: {
        Row: {
          id: string;
          category: string;
          channel: string;
          enabled: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          channel: string;
          enabled?: boolean;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          channel?: string;
          enabled?: boolean;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_segments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string;
          criteria: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: string;
          criteria?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: string;
          criteria?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_segment_members: {
        Row: {
          id: string;
          segment_id: string;
          user_id: string;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          segment_id: string;
          user_id: string;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          segment_id?: string;
          user_id?: string;
          added_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_segment_members_segment_id_fkey";
            columns: ["segment_id"];
            isOneToOne: false;
            referencedRelation: "user_segments";
            referencedColumns: ["id"];
          },
        ];
      };
      broadcasts: {
        Row: {
          id: string;
          title: string;
          body: string;
          ignore_preferences: boolean;
          type: string;
          source: string;
          link: string | null;
          target_type: string;
          target_payload: Json;
          recipient_count: number;
          status: string;
          created_by: string | null;
          sent_by: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          ignore_preferences?: boolean;
          type?: string;
          source?: string;
          link?: string | null;
          target_type: string;
          target_payload?: Json;
          recipient_count?: number;
          status?: string;
          created_by?: string | null;
          sent_by?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          ignore_preferences?: boolean;
          type?: string;
          source?: string;
          link?: string | null;
          target_type?: string;
          target_payload?: Json;
          recipient_count?: number;
          status?: string;
          created_by?: string | null;
          sent_by?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      broadcast_recipients: {
        Row: {
          id: string;
          broadcast_id: string;
          user_id: string;
          notification_id: string | null;
          status: string;
          error_message: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          broadcast_id: string;
          user_id: string;
          notification_id?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          broadcast_id?: string;
          user_id?: string;
          notification_id?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey";
            columns: ["broadcast_id"];
            isOneToOne: false;
            referencedRelation: "broadcasts";
            referencedColumns: ["id"];
          },
        ];
      };
      broadcast_audit_logs: {
        Row: {
          id: string;
          broadcast_id: string;
          actor_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          broadcast_id: string;
          actor_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          broadcast_id?: string;
          actor_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "broadcast_audit_logs_broadcast_id_fkey";
            columns: ["broadcast_id"];
            isOneToOne: false;
            referencedRelation: "broadcasts";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          actor_type: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          project_id: string | null;
          user_id: string | null;
          source: string | null;
          severity: string;
          visibility: string;
          title: string;
          description: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          actor_type?: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          source?: string | null;
          severity?: string;
          visibility?: string;
          title: string;
          description?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          actor_type?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          project_id?: string | null;
          user_id?: string | null;
          source?: string | null;
          severity?: string;
          visibility?: string;
          title?: string;
          description?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      project_activity_events: {
        Row: {
          id: string;
          project_id: string;
          actor_user_id: string | null;
          actor_type: string;
          event_type: string;
          entity_type: string | null;
          entity_id: string | null;
          title: string;
          description: string | null;
          visibility: string;
          severity: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          actor_user_id?: string | null;
          actor_type?: string;
          event_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          title: string;
          description?: string | null;
          visibility?: string;
          severity?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          actor_user_id?: string | null;
          actor_type?: string;
          event_type?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          title?: string;
          description?: string | null;
          visibility?: string;
          severity?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      project_files: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          storage_bucket: string;
          storage_path: string;
          original_file_name: string;
          file_name: string;
          mime_type: string | null;
          file_size: number | null;
          file_hash: string | null;
          status: string;
          processing_status: string;
          extraction_task_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id: string;
          storage_bucket: string;
          storage_path: string;
          original_file_name: string;
          file_name: string;
          mime_type?: string | null;
          file_size?: number | null;
          file_hash?: string | null;
          status?: string;
          processing_status?: string;
          extraction_task_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          original_file_name?: string;
          file_name?: string;
          mime_type?: string | null;
          file_size?: number | null;
          file_hash?: string | null;
          status?: string;
          processing_status?: string;
          extraction_task_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      file_events: {
        Row: {
          id: string;
          file_id: string;
          project_id: string | null;
          user_id: string | null;
          event_type: string;
          title: string;
          description: string | null;
          severity: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          project_id?: string | null;
          user_id?: string | null;
          event_type: string;
          title: string;
          description?: string | null;
          severity?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          project_id?: string | null;
          user_id?: string | null;
          event_type?: string;
          title?: string;
          description?: string | null;
          severity?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "file_events_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "project_files";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_results: {
        Row: {
          id: string;
          task_id: string;
          file_id: string | null;
          project_id: string | null;
          user_id: string;
          status: string;
          result_type: string;
          raw_output: Json;
          structured_data: Json;
          confidence_score: number | null;
          model_name: string | null;
          model_version: string | null;
          extraction_summary: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          file_id?: string | null;
          project_id?: string | null;
          user_id: string;
          status?: string;
          result_type?: string;
          raw_output?: Json;
          structured_data?: Json;
          confidence_score?: number | null;
          model_name?: string | null;
          model_version?: string | null;
          extraction_summary?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          file_id?: string | null;
          project_id?: string | null;
          user_id?: string;
          status?: string;
          result_type?: string;
          raw_output?: Json;
          structured_data?: Json;
          confidence_score?: number | null;
          model_name?: string | null;
          model_version?: string | null;
          extraction_summary?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      extraction_result_items: {
        Row: {
          id: string;
          result_id: string;
          item_type: string;
          label: string | null;
          value: Json;
          original_value: Json | null;
          confidence_score: number | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          item_type: string;
          label?: string | null;
          value?: Json;
          original_value?: Json | null;
          confidence_score?: number | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          item_type?: string;
          label?: string | null;
          value?: Json;
          original_value?: Json | null;
          confidence_score?: number | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_result_items_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_result_reviews: {
        Row: {
          id: string;
          result_id: string;
          reviewer_id: string;
          action: string;
          comment: string | null;
          changes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          reviewer_id: string;
          action: string;
          comment?: string | null;
          changes?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          reviewer_id?: string;
          action?: string;
          comment?: string | null;
          changes?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_result_reviews_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      extraction_result_exports: {
        Row: {
          id: string;
          result_id: string;
          user_id: string;
          export_type: string;
          storage_bucket: string | null;
          storage_path: string | null;
          status: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          user_id: string;
          export_type: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          user_id?: string;
          export_type?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_result_exports_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      result_items: {
        Row: {
          id: string;
          result_id: string;
          item_type: string;
          label: string | null;
          value: Json;
          confidence_score: number | null;
          page_number: number | null;
          source_location: Json;
          status: string;
          reviewer_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          item_type: string;
          label?: string | null;
          value?: Json;
          confidence_score?: number | null;
          page_number?: number | null;
          source_location?: Json;
          status?: string;
          reviewer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          item_type?: string;
          label?: string | null;
          value?: Json;
          confidence_score?: number | null;
          page_number?: number | null;
          source_location?: Json;
          status?: string;
          reviewer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_items_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      result_reviews: {
        Row: {
          id: string;
          result_id: string;
          reviewer_id: string;
          action: string;
          note: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          reviewer_id: string;
          action: string;
          note?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          reviewer_id?: string;
          action?: string;
          note?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_reviews_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      result_corrections: {
        Row: {
          id: string;
          result_id: string;
          result_item_id: string | null;
          corrected_by: string;
          field_path: string;
          old_value: Json | null;
          new_value: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          result_item_id?: string | null;
          corrected_by: string;
          field_path: string;
          old_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string;
          result_item_id?: string | null;
          corrected_by?: string;
          field_path?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_corrections_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_corrections_result_item_id_fkey";
            columns: ["result_item_id"];
            isOneToOne: false;
            referencedRelation: "result_items";
            referencedColumns: ["id"];
          },
        ];
      };
      approved_datasets: {
        Row: {
          id: string;
          result_id: string | null;
          project_id: string | null;
          file_id: string | null;
          user_id: string;
          title: string;
          description: string | null;
          data: Json;
          schema_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          result_id?: string | null;
          project_id?: string | null;
          file_id?: string | null;
          user_id: string;
          title: string;
          description?: string | null;
          data?: Json;
          schema_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          result_id?: string | null;
          project_id?: string | null;
          file_id?: string | null;
          user_id?: string;
          title?: string;
          description?: string | null;
          data?: Json;
          schema_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approved_datasets_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "extraction_results";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_updates: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string;
          content: string;
          category: string;
          status: string;
          visibility: string;
          version: string | null;
          release_date: string | null;
          published_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          summary: string;
          content: string;
          category?: string;
          status?: string;
          visibility?: string;
          version?: string | null;
          release_date?: string | null;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          summary?: string;
          content?: string;
          category?: string;
          status?: string;
          visibility?: string;
          version?: string | null;
          release_date?: string | null;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feature_update_targets: {
        Row: {
          id: string;
          feature_update_id: string;
          target_type: string;
          target_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          feature_update_id: string;
          target_type?: string;
          target_payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          feature_update_id?: string;
          target_type?: string;
          target_payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_update_targets_feature_update_id_fkey";
            columns: ["feature_update_id"];
            isOneToOne: false;
            referencedRelation: "feature_updates";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_update_reads: {
        Row: {
          id: string;
          feature_update_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          feature_update_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          feature_update_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_update_reads_feature_update_id_fkey";
            columns: ["feature_update_id"];
            isOneToOne: false;
            referencedRelation: "feature_updates";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_update_reactions: {
        Row: {
          id: string;
          feature_update_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          feature_update_id: string;
          user_id: string;
          reaction: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          feature_update_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_update_reactions_feature_update_id_fkey";
            columns: ["feature_update_id"];
            isOneToOne: false;
            referencedRelation: "feature_updates";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_update_feedback: {
        Row: {
          id: string;
          feature_update_id: string;
          user_id: string;
          feedback: string;
          rating: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feature_update_id: string;
          user_id: string;
          feedback: string;
          rating?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          feature_update_id?: string;
          user_id?: string;
          feedback?: string;
          rating?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_update_feedback_feature_update_id_fkey";
            columns: ["feature_update_id"];
            isOneToOne: false;
            referencedRelation: "feature_updates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationEventInsert =
  Database["public"]["Tables"]["notification_events"]["Insert"];
export type ExtractionTaskRow =
  Database["public"]["Tables"]["extraction_tasks"]["Row"];
export type ExtractionTaskInsert =
  Database["public"]["Tables"]["extraction_tasks"]["Insert"];
export type ExtractionTaskUpdate =
  Database["public"]["Tables"]["extraction_tasks"]["Update"];
export type PushSubscriptionRow =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type PushSubscriptionInsert =
  Database["public"]["Tables"]["push_subscriptions"]["Insert"];
export type ConversationRow =
  Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationMemberRow =
  Database["public"]["Tables"]["conversation_members"]["Row"];
export type ConversationMemberInsert =
  Database["public"]["Tables"]["conversation_members"]["Insert"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type MessageReadRow =
  Database["public"]["Tables"]["message_reads"]["Row"];
export type MessageReadInsert =
  Database["public"]["Tables"]["message_reads"]["Insert"];
export type ServiceApiKeyRow =
  Database["public"]["Tables"]["service_api_keys"]["Row"];
export type ServiceApiKeyInsert =
  Database["public"]["Tables"]["service_api_keys"]["Insert"];
export type ServiceApiKeyUpdate =
  Database["public"]["Tables"]["service_api_keys"]["Update"];
export type WebhookEventRow =
  Database["public"]["Tables"]["webhook_events"]["Row"];
export type WebhookEventInsert =
  Database["public"]["Tables"]["webhook_events"]["Insert"];
export type WebhookEventUpdate =
  Database["public"]["Tables"]["webhook_events"]["Update"];
export type WebhookEventLogRow =
  Database["public"]["Tables"]["webhook_event_logs"]["Row"];
export type WebhookEventLogInsert =
  Database["public"]["Tables"]["webhook_event_logs"]["Insert"];
export type UserNotificationPreferenceRow =
  Database["public"]["Tables"]["user_notification_preferences"]["Row"];
export type UserNotificationPreferenceInsert =
  Database["public"]["Tables"]["user_notification_preferences"]["Insert"];
export type UserNotificationPreferenceUpdate =
  Database["public"]["Tables"]["user_notification_preferences"]["Update"];
export type NotificationPreferenceDefaultRow =
  Database["public"]["Tables"]["notification_preference_defaults"]["Row"];
export type NotificationPreferenceDefaultInsert =
  Database["public"]["Tables"]["notification_preference_defaults"]["Insert"];
export type NotificationPreferenceDefaultUpdate =
  Database["public"]["Tables"]["notification_preference_defaults"]["Update"];
export type UserSegmentRow =
  Database["public"]["Tables"]["user_segments"]["Row"];
export type UserSegmentInsert =
  Database["public"]["Tables"]["user_segments"]["Insert"];
export type UserSegmentUpdate =
  Database["public"]["Tables"]["user_segments"]["Update"];
export type UserSegmentMemberRow =
  Database["public"]["Tables"]["user_segment_members"]["Row"];
export type UserSegmentMemberInsert =
  Database["public"]["Tables"]["user_segment_members"]["Insert"];
export type BroadcastRow = Database["public"]["Tables"]["broadcasts"]["Row"];
export type BroadcastInsert =
  Database["public"]["Tables"]["broadcasts"]["Insert"];
export type BroadcastUpdate =
  Database["public"]["Tables"]["broadcasts"]["Update"];
export type BroadcastRecipientRow =
  Database["public"]["Tables"]["broadcast_recipients"]["Row"];
export type BroadcastRecipientInsert =
  Database["public"]["Tables"]["broadcast_recipients"]["Insert"];
export type BroadcastRecipientUpdate =
  Database["public"]["Tables"]["broadcast_recipients"]["Update"];
export type BroadcastAuditLogRow =
  Database["public"]["Tables"]["broadcast_audit_logs"]["Row"];
export type BroadcastAuditLogInsert =
  Database["public"]["Tables"]["broadcast_audit_logs"]["Insert"];
export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
export type AuditLogInsert =
  Database["public"]["Tables"]["audit_logs"]["Insert"];
export type AuditLogUpdate =
  Database["public"]["Tables"]["audit_logs"]["Update"];
export type ProjectActivityEventRow =
  Database["public"]["Tables"]["project_activity_events"]["Row"];
export type ProjectActivityEventInsert =
  Database["public"]["Tables"]["project_activity_events"]["Insert"];
export type ProjectActivityEventUpdate =
  Database["public"]["Tables"]["project_activity_events"]["Update"];
export type ProjectFileRow =
  Database["public"]["Tables"]["project_files"]["Row"];
export type ProjectFileInsert =
  Database["public"]["Tables"]["project_files"]["Insert"];
export type ProjectFileUpdate =
  Database["public"]["Tables"]["project_files"]["Update"];
export type FileEventRow = Database["public"]["Tables"]["file_events"]["Row"];
export type FileEventInsert =
  Database["public"]["Tables"]["file_events"]["Insert"];
export type FileEventUpdate =
  Database["public"]["Tables"]["file_events"]["Update"];
export type ExtractionResultRow =
  Database["public"]["Tables"]["extraction_results"]["Row"];
export type ExtractionResultInsert =
  Database["public"]["Tables"]["extraction_results"]["Insert"];
export type ExtractionResultUpdate =
  Database["public"]["Tables"]["extraction_results"]["Update"];
export type ExtractionResultItemRow =
  Database["public"]["Tables"]["extraction_result_items"]["Row"];
export type ExtractionResultItemInsert =
  Database["public"]["Tables"]["extraction_result_items"]["Insert"];
export type ExtractionResultItemUpdate =
  Database["public"]["Tables"]["extraction_result_items"]["Update"];
export type ExtractionResultReviewRow =
  Database["public"]["Tables"]["extraction_result_reviews"]["Row"];
export type ExtractionResultReviewInsert =
  Database["public"]["Tables"]["extraction_result_reviews"]["Insert"];
export type ExtractionResultReviewUpdate =
  Database["public"]["Tables"]["extraction_result_reviews"]["Update"];
export type ExtractionResultExportRow =
  Database["public"]["Tables"]["extraction_result_exports"]["Row"];
export type ExtractionResultExportInsert =
  Database["public"]["Tables"]["extraction_result_exports"]["Insert"];
export type ExtractionResultExportUpdate =
  Database["public"]["Tables"]["extraction_result_exports"]["Update"];
export type ResultItemRow = Database["public"]["Tables"]["result_items"]["Row"];
export type ResultItemInsert =
  Database["public"]["Tables"]["result_items"]["Insert"];
export type ResultItemUpdate =
  Database["public"]["Tables"]["result_items"]["Update"];
export type ResultReviewRow =
  Database["public"]["Tables"]["result_reviews"]["Row"];
export type ResultReviewInsert =
  Database["public"]["Tables"]["result_reviews"]["Insert"];
export type ResultReviewUpdate =
  Database["public"]["Tables"]["result_reviews"]["Update"];
export type ResultCorrectionRow =
  Database["public"]["Tables"]["result_corrections"]["Row"];
export type ResultCorrectionInsert =
  Database["public"]["Tables"]["result_corrections"]["Insert"];
export type ResultCorrectionUpdate =
  Database["public"]["Tables"]["result_corrections"]["Update"];
export type ApprovedDatasetRow =
  Database["public"]["Tables"]["approved_datasets"]["Row"];
export type ApprovedDatasetInsert =
  Database["public"]["Tables"]["approved_datasets"]["Insert"];
export type ApprovedDatasetUpdate =
  Database["public"]["Tables"]["approved_datasets"]["Update"];
export type FeatureUpdateRow =
  Database["public"]["Tables"]["feature_updates"]["Row"];
export type FeatureUpdateInsert =
  Database["public"]["Tables"]["feature_updates"]["Insert"];
export type FeatureUpdateUpdate =
  Database["public"]["Tables"]["feature_updates"]["Update"];
export type FeatureUpdateTargetRow =
  Database["public"]["Tables"]["feature_update_targets"]["Row"];
export type FeatureUpdateTargetInsert =
  Database["public"]["Tables"]["feature_update_targets"]["Insert"];
export type FeatureUpdateTargetUpdate =
  Database["public"]["Tables"]["feature_update_targets"]["Update"];
export type FeatureUpdateReadRow =
  Database["public"]["Tables"]["feature_update_reads"]["Row"];
export type FeatureUpdateReadInsert =
  Database["public"]["Tables"]["feature_update_reads"]["Insert"];
export type FeatureUpdateReadUpdate =
  Database["public"]["Tables"]["feature_update_reads"]["Update"];
export type FeatureUpdateReactionRow =
  Database["public"]["Tables"]["feature_update_reactions"]["Row"];
export type FeatureUpdateReactionInsert =
  Database["public"]["Tables"]["feature_update_reactions"]["Insert"];
export type FeatureUpdateReactionUpdate =
  Database["public"]["Tables"]["feature_update_reactions"]["Update"];
export type FeatureUpdateFeedbackRow =
  Database["public"]["Tables"]["feature_update_feedback"]["Row"];
export type FeatureUpdateFeedbackInsert =
  Database["public"]["Tables"]["feature_update_feedback"]["Insert"];
export type FeatureUpdateFeedbackUpdate =
  Database["public"]["Tables"]["feature_update_feedback"]["Update"];
