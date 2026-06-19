import { createClient } from "@supabase/supabase-js";

// Read Supabase environment variables configured in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Global Supabase Client instance for executing Auth, Database queries,
 * and Realtime subscriptions from both client components and server functions.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * TypeScript definitions mapping the structure of the Supabase PostgreSQL schema.
 * Ensure any updates in SUPABASE_SETUP.sql are reflected here for compile-time safety.
 */
export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          workspace_key: string;
          owner_id: string | null;
          owner_email: string | null;
          plan: "standard" | "premium";
          billing_status: "active" | "past_due" | "canceled";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          workspace_key: string;
          owner_id?: string | null;
          owner_email?: string | null;
          plan?: "standard" | "premium";
          billing_status?: "active" | "past_due" | "canceled";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          workspace_key?: string;
          owner_id?: string | null;
          owner_email?: string | null;
          plan?: "standard" | "premium";
          billing_status?: "active" | "past_due" | "canceled";
          created_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "admin" | "editor" | "viewer";
          job_title: string | null;
          joined_at: string;
          added_by: string | null;
          avatar_color: string | null;
          status: "active" | "pending";
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          email: string;
          display_name?: string | null;
          role: "owner" | "admin" | "editor" | "viewer";
          job_title?: string | null;
          joined_at?: string;
          added_by?: string | null;
          avatar_color?: string | null;
          status?: "active" | "pending";
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          email?: string;
          display_name?: string | null;
          role?: "owner" | "admin" | "editor" | "viewer";
          job_title?: string | null;
          joined_at?: string;
          added_by?: string | null;
          avatar_color?: string | null;
          status?: "active" | "pending";
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          status: "active" | "completed" | "on_hold" | "planning";
          priority: "critical" | "high" | "medium" | "low";
          total_story_points: number;
          remaining_story_points: number;
          start_date: string | null;
          target_date: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          status?: "active" | "completed" | "on_hold" | "planning";
          priority?: "critical" | "high" | "medium" | "low";
          total_story_points?: number;
          remaining_story_points?: number;
          start_date?: string | null;
          target_date?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          status?: "active" | "completed" | "on_hold" | "planning";
          priority?: "critical" | "high" | "medium" | "low";
          total_story_points?: number;
          remaining_story_points?: number;
          start_date?: string | null;
          target_date?: string | null;
          tags?: string[];
          created_at?: string;
        };
      };
      project_files: {
        Row: { id: string; project_id: string; name: string; size: number; added_at: string; };
        Insert: { id?: string; project_id: string; name: string; size: number; added_at?: string; };
        Update: { id?: string; project_id?: string; name?: string; size?: number; added_at?: string; };
      };
      test_suites: {
        Row: { id: string; project_id: string; workspace_id: string; name: string; created_at: string; };
        Insert: { id?: string; project_id: string; workspace_id: string; name: string; created_at?: string; };
        Update: { id?: string; project_id?: string; workspace_id?: string; name?: string; created_at?: string; };
      };
      test_cases: {
        Row: {
          id: string;
          suite_id: string;
          workspace_id: string;
          title: string;
          steps: string | null;
          expected: string | null;
          priority: "critical" | "high" | "medium" | "low";
          author_status: "draft" | "ready" | "approved";
          last_run_status: "passed" | "failed" | "skipped" | null;
          last_run_id: string | null;
          tags: string[];
          type: "functional" | "regression" | "smoke" | "performance" | "security" | "integration" | "e2e" | null;
          assigned_to: string | null;
          requirement_id: string | null;
          source_recording_id: string | null;
          module_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          suite_id: string;
          workspace_id: string;
          title: string;
          steps?: string | null;
          expected?: string | null;
          priority?: "critical" | "high" | "medium" | "low";
          author_status?: "draft" | "ready" | "approved";
          last_run_status?: "passed" | "failed" | "skipped" | null;
          last_run_id?: string | null;
          tags?: string[];
          type?: "functional" | "regression" | "smoke" | "performance" | "security" | "integration" | "e2e" | null;
          assigned_to?: string | null;
          requirement_id?: string | null;
          source_recording_id?: string | null;
          module_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          suite_id?: string;
          workspace_id?: string;
          title?: string;
          steps?: string | null;
          expected?: string | null;
          priority?: "critical" | "high" | "medium" | "low";
          author_status?: "draft" | "ready" | "approved";
          last_run_status?: "passed" | "failed" | "skipped" | null;
          last_run_id?: string | null;
          tags?: string[];
          type?: "functional" | "regression" | "smoke" | "performance" | "security" | "integration" | "e2e" | null;
          assigned_to?: string | null;
          requirement_id?: string | null;
          source_recording_id?: string | null;
          module_name?: string | null;
          created_at?: string;
        };
      };
      test_runs: {
        Row: {
          id: string;
          project_id: string;
          workspace_id: string;
          suite_id: string | null;
          suite_name: string | null;
          project_name: string | null;
          duration: number;
          status: "running" | "passed" | "failed" | "aborted";
          coverage: number | null;
          environment: string | null;
          started_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          workspace_id: string;
          suite_id?: string | null;
          suite_name?: string | null;
          project_name?: string | null;
          duration?: number;
          status: "running" | "passed" | "failed" | "aborted";
          coverage?: number | null;
          environment?: string | null;
          started_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          workspace_id?: string;
          suite_id?: string | null;
          suite_name?: string | null;
          project_name?: string | null;
          duration?: number;
          status?: "running" | "passed" | "failed" | "aborted";
          coverage?: number | null;
          environment?: string | null;
          started_at?: string;
        };
      };
      test_run_results: {
        Row: { id: string; run_id: string; test_case_id: string; status: "passed" | "failed" | "skipped"; duration: number; error_message: string | null; };
        Insert: { id?: string; run_id: string; test_case_id: string; status: "passed" | "failed" | "skipped"; duration?: number; error_message?: string | null; };
        Update: { id?: string; run_id?: string; test_case_id?: string; status?: "passed" | "failed" | "skipped"; duration?: number; error_message?: string | null; };
      };
      bugs: {
        Row: {
          id: string;
          project_id: string;
          workspace_id: string;
          test_case_title: string;
          test_case_id: string | null;
          run_id: string | null;
          recording_session_id: string | null;
          error_message: string | null;
          code_snippet: string | null;
          developer_notes: string | null;
          is_resolved: boolean;
          resolved_at: string | null;
          severity: "blocker" | "critical" | "major" | "minor" | "trivial";
          environment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          workspace_id: string;
          test_case_title: string;
          test_case_id?: string | null;
          run_id?: string | null;
          recording_session_id?: string | null;
          error_message?: string | null;
          code_snippet?: string | null;
          developer_notes?: string | null;
          is_resolved?: boolean;
          resolved_at?: string | null;
          severity?: "blocker" | "critical" | "major" | "minor" | "trivial";
          environment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          workspace_id?: string;
          test_case_title?: string;
          test_case_id?: string | null;
          run_id?: string | null;
          recording_session_id?: string | null;
          error_message?: string | null;
          code_snippet?: string | null;
          developer_notes?: string | null;
          is_resolved?: boolean;
          resolved_at?: string | null;
          severity?: "blocker" | "critical" | "major" | "minor" | "trivial";
          environment?: string | null;
          created_at?: string;
        };
      };
      sprints: {
        Row: { id: string; project_id: string; workspace_id: string; name: string; goal_description: string | null; status: "Upcoming" | "Active" | "Completed" | null; start_date: string | null; end_date: string | null; story_points_allocated: number; sprint_lead_id: string | null; sprint_members: string[]; sprint_developers: string[]; sprint_testers: string[]; created_at: string; };
        Insert: { id?: string; project_id: string; workspace_id: string; name: string; goal_description?: string | null; status?: "Upcoming" | "Active" | "Completed" | null; start_date?: string | null; end_date?: string | null; story_points_allocated?: number; sprint_lead_id?: string | null; sprint_members?: string[]; sprint_developers?: string[]; sprint_testers?: string[]; created_at?: string; };
        Update: { id?: string; project_id?: string; workspace_id?: string; name?: string; goal_description?: string | null; status?: "Upcoming" | "Active" | "Completed" | null; start_date?: string | null; end_date?: string | null; story_points_allocated?: number; sprint_lead_id?: string | null; sprint_members?: string[]; sprint_developers?: string[]; sprint_testers?: string[]; created_at?: string; };
      };
      profiles: {
        Row: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; created_at: string; };
        Insert: { id?: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; created_at?: string; };
        Update: { id?: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; created_at?: string; };
      };
    };
  };
};
