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
