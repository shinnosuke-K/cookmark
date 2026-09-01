// Hand-written to match the shape of `supabase gen types typescript` output.
// Keep this in sync with supabase/migrations/0001_init.sql until the Supabase
// project exists and types can be generated for real.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecipeStatus = "todo" | "cooked";
export type RecipeVerdict = "repeat" | "meh";
export type RecipeCategory = "主菜" | "副菜" | "汁物" | "麺・丼" | "おやつ";

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          invite_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          invite_token?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          board_id: string;
          anon_user_id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          anon_user_id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          anon_user_id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          id: string;
          board_id: string;
          instagram_url: string | null;
          post_shortcode: string | null;
          title: string;
          author_handle: string | null;
          status: RecipeStatus;
          verdict: RecipeVerdict | null;
          category: RecipeCategory | null;
          memo: string | null;
          photo_path: string | null;
          added_by: string;
          cooked_at: string | null;
          created_at: string;
          cook_count: number;
        };
        Insert: {
          id?: string;
          board_id: string;
          instagram_url?: string | null;
          post_shortcode?: string | null;
          title: string;
          author_handle?: string | null;
          status?: RecipeStatus;
          verdict?: RecipeVerdict | null;
          category?: RecipeCategory | null;
          memo?: string | null;
          photo_path?: string | null;
          added_by: string;
          cooked_at?: string | null;
          created_at?: string;
          cook_count?: number;
        };
        Update: {
          id?: string;
          board_id?: string;
          instagram_url?: string | null;
          post_shortcode?: string | null;
          title?: string;
          author_handle?: string | null;
          status?: RecipeStatus;
          verdict?: RecipeVerdict | null;
          category?: RecipeCategory | null;
          memo?: string | null;
          photo_path?: string | null;
          added_by?: string;
          cooked_at?: string | null;
          created_at?: string;
          cook_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_board: {
        Args: { name: string };
        Returns: string;
      };
      join_board: {
        Args: { token: string; name: string };
        Returns: string;
      };
      is_board_member: {
        Args: { target_board_id: string };
        Returns: boolean;
      };
      rotate_invite_token: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
