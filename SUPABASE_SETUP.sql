-- ==========================================
-- FIELD NOTES QA - SUPABASE SCHEMA SETUP
-- ==========================================
-- This script creates all tables, triggers, and Row Level Security (RLS) policies 
-- necessary for migrating the Field Notes QA app from local storage to Supabase.
-- It assumes that Supabase Auth (auth.users) is already active.

-- ==========================================
-- 1. WORKSPACES & MEMBERS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  workspace_key text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email text,
  plan text DEFAULT 'standard' CHECK (plan IN ('standard', 'premium')),
  billing_status text DEFAULT 'active' CHECK (billing_status IN ('active', 'past_due', 'canceled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  job_title text,
  joined_at timestamptz DEFAULT now(),
  added_by text, -- Could be a UUID if we want to enforce FK
  avatar_color text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  UNIQUE(workspace_id, user_id)
);

-- ==========================================
-- 2. PROJECTS & FILES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'planning')),
  priority text DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  total_story_points integer DEFAULT 0,
  remaining_story_points integer DEFAULT 0,
  start_date date,
  target_date date,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Note: In localStorage, files were embedded in Project.
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  size integer NOT NULL,
  added_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. TEST SUITES & TEST CASES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.test_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id uuid REFERENCES public.test_suites(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  steps text,
  expected text,
  priority text DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  author_status text DEFAULT 'draft' CHECK (author_status IN ('draft', 'ready', 'approved')),
  last_run_status text CHECK (last_run_status IN ('passed', 'failed', 'skipped', NULL)),
  last_run_id text, -- Loose FK to test_runs
  tags text[] DEFAULT '{}',
  type text CHECK (type IN ('functional', 'regression', 'smoke', 'performance', 'security', 'integration', 'e2e', NULL)),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requirement_id text,
  source_recording_id text,
  module_name text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 4. TEST RUNS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  suite_id uuid REFERENCES public.test_suites(id) ON DELETE SET NULL,
  suite_name text,
  project_name text,
  duration integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('running', 'passed', 'failed', 'aborted')),
  coverage integer,
  environment text DEFAULT 'localhost',
  started_at timestamptz DEFAULT now()
);

-- Results are currently an array on the TestRun object in localStorage. We break them into a table.
CREATE TABLE IF NOT EXISTS public.test_run_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_case_id uuid REFERENCES public.test_cases(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration integer DEFAULT 0,
  error_message text
);

-- ==========================================
-- 5. BUGS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  test_case_title text NOT NULL,
  test_case_id uuid REFERENCES public.test_cases(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.test_runs(id) ON DELETE SET NULL,
  recording_session_id text,
  error_message text,
  code_snippet text,
  developer_notes text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  severity text DEFAULT 'minor' CHECK (severity IN ('blocker', 'critical', 'major', 'minor', 'trivial')),
  environment text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 6. SPRINTS (Already Partially Supported but defining here for completeness)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal_description text,
  status text CHECK (status IN ('Upcoming', 'Active', 'Completed')),
  start_date date,
  end_date date,
  story_points_allocated integer DEFAULT 0,
  sprint_lead_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sprint_members text[] DEFAULT '{}',
  sprint_developers text[] DEFAULT '{}',
  sprint_testers text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 7. PROFILES, SETTINGS, NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all operational tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if user is in a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces Policies
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces FOR SELECT USING (is_workspace_member(id));
CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owners can update workspaces" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());

-- Workspace Members Policies
CREATE POLICY "Members can view other members in their workspace" ON public.workspace_members FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Owners and Admins can insert members" ON public.workspace_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR user_id = auth.uid() -- Allow self-insert when creating workspace
);
CREATE POLICY "Owners and Admins can update members" ON public.workspace_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Owners and Admins can delete members" ON public.workspace_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Projects Policies
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert projects" ON public.projects FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update projects" ON public.projects FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete projects" ON public.projects FOR DELETE USING (is_workspace_member(workspace_id));

-- Project Files Policies
CREATE POLICY "Members can view project files" ON public.project_files FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND is_workspace_member(workspace_id)));
CREATE POLICY "Members can insert project files" ON public.project_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND is_workspace_member(workspace_id)));
CREATE POLICY "Members can delete project files" ON public.project_files FOR DELETE USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND is_workspace_member(workspace_id)));

-- Test Suites Policies
CREATE POLICY "Members can view test suites" ON public.test_suites FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert test suites" ON public.test_suites FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update test suites" ON public.test_suites FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete test suites" ON public.test_suites FOR DELETE USING (is_workspace_member(workspace_id));

-- Test Cases Policies
CREATE POLICY "Members can view test cases" ON public.test_cases FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert test cases" ON public.test_cases FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update test cases" ON public.test_cases FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete test cases" ON public.test_cases FOR DELETE USING (is_workspace_member(workspace_id));

-- Test Runs Policies
CREATE POLICY "Members can view test runs" ON public.test_runs FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert test runs" ON public.test_runs FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update test runs" ON public.test_runs FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete test runs" ON public.test_runs FOR DELETE USING (is_workspace_member(workspace_id));

-- Test Run Results Policies
CREATE POLICY "Members can view test run results" ON public.test_run_results FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_runs WHERE id = run_id AND is_workspace_member(workspace_id)));
CREATE POLICY "Members can insert test run results" ON public.test_run_results FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.test_runs WHERE id = run_id AND is_workspace_member(workspace_id)));

-- Bugs Policies
CREATE POLICY "Members can view bugs" ON public.bugs FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert bugs" ON public.bugs FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update bugs" ON public.bugs FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete bugs" ON public.bugs FOR DELETE USING (is_workspace_member(workspace_id));

-- Sprints Policies
CREATE POLICY "Members can view sprints" ON public.sprints FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert sprints" ON public.sprints FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update sprints" ON public.sprints FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete sprints" ON public.sprints FOR DELETE USING (is_workspace_member(workspace_id));

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
