import { supabase } from "@/backend/supabase";
import { 
  Project, 
  projectsStore, 
  suitesStore, 
  testCasesStore, 
  runsStore, 
  bugsStore, 
  TestCase,
  TestRun,
  BugReport
} from "./store";

/**
 * Core function to sync all workspace data from Supabase down to the local state stores.
 * This runs after `initializeStores` or when switching workspaces.
 */
export async function syncWorkspaceFromSupabase(workspaceId: string, userId: string, userEmail: string, userName: string) {
  if (!workspaceId || !userId) return;

  try {
    // 0. Auto-create workspace and membership if they don't exist
    const { data: existingByUid } = await supabase
      .from('workspace_members')
      .select('id, role, status')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: existingByEmail } = await supabase
      .from('workspace_members')
      .select('id, role, status')
      .eq('email', userEmail)
      .maybeSingle();

    const existing = existingByUid || existingByEmail;

    if (existing) {
      // User already has a membership (active or pending). 
      // Do NOT create a new workspace. Do NOT change their role.
      return;
    }

    // No membership found — this is a truly new user with no invites.
    // Check if workspace exists
    const { data: wsData } = await supabase.from('workspaces').select('id').eq('id', workspaceId).maybeSingle();
    if (!wsData) {
      const workspaceName = workspaceId === 'ws-1001' ? 'QAMind AI Demo Workspace' : 'My Workspace';

      await supabase.from('workspaces').insert({
        id: workspaceId,
        name: workspaceName,
        workspace_key: 'FNQ-' + Math.floor(Math.random() * 10000),
        owner_id: userId,
        owner_email: userEmail
      });
    }
    
    // Insert member as owner
    await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: userId,
      email: userEmail,
      role: 'owner',
      status: 'active'
    });

  } catch (error) {
    console.error("Failed to auto-provision workspace from Supabase", error);
  }
}

/**
 * Fetches the user's data from Supabase and populates the local stores.
 */
export async function fetchWorkspaceData(workspaceId: string) {
  if (!workspaceId) return;

  try {
    // 1. Fetch Projects
    const { data: projectsData } = await supabase.from('projects').select('*').eq('workspace_id', workspaceId);
    if (projectsData) {
      projectsStore.set(projectsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        status: p.status,
        priority: p.priority,
        totalStoryPoints: p.total_story_points,
        remainingStoryPoints: p.remaining_story_points,
        startDate: p.start_date || "",
        targetDate: p.target_date || "",
        tags: p.tags || [],
        createdAt: new Date(p.created_at).getTime(),
        files: [] // Fetch files separately if needed
      })));
    }

    // 2. Fetch Suites
    const { data: suitesData } = await supabase.from('test_suites').select('*').eq('workspace_id', workspaceId);
    
    // 3. Fetch Test Cases
    const { data: testCasesData } = await supabase.from('test_cases').select('*').eq('workspace_id', workspaceId);

    if (suitesData && testCasesData) {
       const mappedCases: TestCase[] = testCasesData.map((tc: any) => ({
           id: tc.id,
           suiteId: tc.suite_id,
           title: tc.title,
           steps: tc.steps || "",
           expected: tc.expected || "",
           priority: tc.priority,
           authorStatus: tc.author_status,
           status: tc.author_status, // backwards compat
           lastRunStatus: tc.last_run_status || undefined,
           lastRunId: tc.last_run_id || undefined,
           tags: tc.tags || [],
           type: tc.type || undefined,
           assignedTo: tc.assigned_to || undefined,
           requirementId: tc.requirement_id || undefined,
           sourceRecordingId: tc.source_recording_id || undefined,
           module_name: tc.module_name || undefined,
           project_id: tc.suite_id, // roughly
           createdAt: new Date(tc.created_at).getTime()
       }));
       testCasesStore.set(mappedCases);

       suitesStore.set(suitesData.map((s: any) => ({
           id: s.id,
           projectId: s.project_id,
           name: s.name,
           createdAt: new Date(s.created_at).getTime(),
           testCaseIds: mappedCases.filter(tc => tc.suiteId === s.id).map(tc => tc.id)
       })));
    }

    // 4. Fetch Runs
    const { data: runsData } = await supabase.from('test_runs').select('*, test_run_results(*)').eq('workspace_id', workspaceId);
    if (runsData) {
       runsStore.set(runsData.map((r: any) => ({
          id: r.id,
          projectId: r.project_id,
          suiteId: r.suite_id || undefined,
          suiteName: r.suite_name || undefined,
          projectName: r.project_name || undefined,
          startedAt: new Date(r.started_at).getTime(),
          duration: r.duration,
          status: r.status,
          coverage: r.coverage || undefined,
          environment: r.environment || undefined,
          results: (r.test_run_results || []).map((res: any) => ({
             testCaseId: res.test_case_id,
             status: res.status,
             duration: res.duration,
             error: res.error_message || undefined
          }))
       })));
    }

    // 5. Fetch Bugs
    const { data: bugsData } = await supabase.from('bugs').select('*').eq('workspace_id', workspaceId);
    if (bugsData) {
        bugsStore.set(bugsData.map((b: any) => ({
            id: b.id,
            project_id: b.project_id,
            test_case_title: b.test_case_title,
            testCaseId: b.test_case_id || undefined,
            runId: b.run_id || undefined,
            recordingSessionId: b.recording_session_id || undefined,
            error_message: b.error_message || "",
            code_snippet: b.code_snippet || "",
            developer_notes: b.developer_notes,
            is_resolved: b.is_resolved,
            resolved_at: b.resolved_at,
            severity: b.severity,
            environment: b.environment || undefined,
            created_at: b.created_at
        })));
    }

  } catch (error) {
    console.error("Failed to fetch workspace data from Supabase", error);
  }
}
