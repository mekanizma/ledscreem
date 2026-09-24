import type {
  ContentType,
  FitMode,
  VideoEndBehavior,
  DisplayOrientation,
} from "@/lib/config/display";

export type UserRole = "admin" | "viewer";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface AnnouncementData {
  title: string;
  description: string;
  subtitle: string;
  logo_url: string | null;
  qr_url: string | null;
  background: string;
  text_color: string;
  alignment: "left" | "center" | "right";
  show_qr: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Display {
  id: string;
  name: string;
  location: string | null;
  display_code: string;
  width: number;
  height: number;
  orientation: DisplayOrientation;
  last_seen: string | null;
  status: "online" | "offline" | "unknown";
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  image_url: string | null;
  video_url: string | null;
  media_path: string | null;
  duration: number;
  fit_mode: FitMode;
  video_end_behavior: VideoEndBehavior;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  announcement_data: AnnouncementData | null;
  created_at: string;
  updated_at: string;
}

export interface DisplayContent {
  id: string;
  display_id: string;
  content_id: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisplayContentWithContent extends DisplayContent {
  content: Content;
}

export interface PlaylistItem {
  id: string;
  display_content_id: string;
  content_id: string;
  sort_order: number;
  title: string;
  type: ContentType;
  duration: number;
  fit_mode: FitMode;
  video_end_behavior: VideoEndBehavior;
  image_url: string | null;
  video_url: string | null;
  announcement_data: AnnouncementData | null;
  start_at: string | null;
  end_at: string | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      displays: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          display_code: string;
          width: number;
          height: number;
          orientation: string;
          last_seen: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          display_code: string;
          width?: number;
          height?: number;
          orientation?: string;
          last_seen?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          display_code?: string;
          width?: number;
          height?: number;
          orientation?: string;
          last_seen?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: string;
          image_url: string | null;
          video_url: string | null;
          media_path: string | null;
          duration: number;
          fit_mode: string;
          video_end_behavior: string;
          active: boolean;
          start_at: string | null;
          end_at: string | null;
          announcement_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type: string;
          image_url?: string | null;
          video_url?: string | null;
          media_path?: string | null;
          duration?: number;
          fit_mode?: string;
          video_end_behavior?: string;
          active?: boolean;
          start_at?: string | null;
          end_at?: string | null;
          announcement_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: string;
          image_url?: string | null;
          video_url?: string | null;
          media_path?: string | null;
          duration?: number;
          fit_mode?: string;
          video_end_behavior?: string;
          active?: boolean;
          start_at?: string | null;
          end_at?: string | null;
          announcement_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      display_contents: {
        Row: {
          id: string;
          display_id: string;
          content_id: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_id: string;
          content_id: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_id?: string;
          content_id?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "display_contents_display_id_fkey";
            columns: ["display_id"];
            isOneToOne: false;
            referencedRelation: "displays";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "display_contents_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "contents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      touch_display_heartbeat: {
        Args: { p_display_code: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/** Map DB row → app Content (narrow unions) */
export function asContent(row: Database["public"]["Tables"]["contents"]["Row"]): Content {
  const rawFit = row.fit_mode;
  const fit_mode: FitMode =
    rawFit === "contain" || rawFit === "cover" || rawFit === "stretch"
      ? rawFit
      : "stretch";

  return {
    ...row,
    type: row.type as ContentType,
    fit_mode,
    video_end_behavior: row.video_end_behavior as VideoEndBehavior,
    announcement_data: row.announcement_data as AnnouncementData | null,
  };
}

export function asDisplay(row: Database["public"]["Tables"]["displays"]["Row"]): Display {
  return {
    ...row,
    orientation: row.orientation as DisplayOrientation,
    status: row.status as Display["status"],
  };
}

export function asProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): Profile {
  return {
    ...row,
    role: row.role as UserRole,
  };
}
