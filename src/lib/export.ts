import * as XLSX from "xlsx";
import { type TestCase, type TestRun, type BugReport, type Project, type TestSuite } from "./store";

export function exportToExcel({
  projectName,
  cases,
  runs,
  bugs,
  inputInfo,
}: {
  projectName: string;
  cases: TestCase[];
  runs: TestRun[];
  bugs: BugReport[];
  inputInfo?: { type: string; summary: string };
}) {
  const wb = XLSX.utils.book_new();

  // 1. Test Cases Sheet
  const tcData = cases.map((tc) => ({
    "ID": tc.id.slice(0, 8).toUpperCase(), // Using short ID to match standard TC-XXX if needed, but uuid uses first 8
    "Title": tc.title,
    "Type": tc.tags.includes("negative") ? "Negative" : tc.tags.includes("edge case") ? "Edge Case" : "Positive",
    "Priority": tc.priority === "critical" ? "P0" : tc.priority === "high" ? "P1" : "P2",
    "Status": tc.status.charAt(0).toUpperCase() + tc.status.slice(1),
    "Assigned To": "",
    "Preconditions": "",
    "Steps": tc.steps,
    "Expected Result": tc.expected,
  }));
  const tcHeaders = ["ID", "Title", "Type", "Priority", "Status", "Assigned To", "Preconditions", "Steps", "Expected Result"];
  const wsTC = tcData.length > 0 ? XLSX.utils.json_to_sheet(tcData) : XLSX.utils.json_to_sheet([], { header: tcHeaders });
  XLSX.utils.book_append_sheet(wb, wsTC, "Test Cases");

  // 2. Execution Results
  const erData = runs.flatMap((run) =>
    run.results.map((res) => {
      const tc = cases.find((c) => c.id === res.testCaseId);
      return {
        "Run ID": run.id,
        "Test Case ID": tc?.id.slice(0, 8).toUpperCase() || res.testCaseId.slice(0, 8).toUpperCase(),
        "Test Case Title": tc?.title || "Unknown",
        "Result": res.status.charAt(0).toUpperCase() + res.status.slice(1),
        "Duration (s)": (res.duration / 1000).toFixed(1),
        "Run Date": new Date(run.startedAt).toLocaleString("en-CA").replace(", ", " ").slice(0, 16),
        "Environment": "localhost",
        "Notes": res.error || "",
      };
    })
  );
  
  const erHeaders = ["Run ID", "Test Case ID", "Test Case Title", "Result", "Duration (s)", "Run Date", "Environment", "Notes"];
  const wsER = erData.length > 0 ? XLSX.utils.json_to_sheet(erData) : XLSX.utils.json_to_sheet([], { header: erHeaders });
  XLSX.utils.book_append_sheet(wb, wsER, "Execution Results");

  // 3. Bug Report
  const brData = bugs.map((bug) => ({
    "Bug ID": bug.id,
    "Title": bug.title,
    "Linked TC": bug.testCaseId ? bug.testCaseId.slice(0, 8).toUpperCase() : "",
    "Severity": bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1),
    "Status": bug.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    "Description": bug.description,
    "Reported Date": new Date(bug.createdAt).toISOString().split("T")[0],
    "Closed Date": bug.status === "closed" ? new Date(bug.createdAt).toISOString().split("T")[0] : "", // Simplification
  }));
  
  const brHeaders = ["Bug ID", "Title", "Linked TC", "Severity", "Status", "Description", "Reported Date", "Closed Date"];
  const wsBR = brData.length > 0 ? XLSX.utils.json_to_sheet(brData) : XLSX.utils.json_to_sheet([], { header: brHeaders });
  XLSX.utils.book_append_sheet(wb, wsBR, "Bug Report");

  // 4. AI Test Report
  const aiData = [
    {
      "Generated At": new Date().toISOString(),
      "Project": projectName,
      "Input Type": inputInfo?.type || "Manual",
      "Framework": "Playwright",
      "Cases Generated": cases.length,
      "Model Used": "Claude 3.5 Sonnet",
      "Input Summary": inputInfo?.summary ? inputInfo.summary.substring(0, 100) : "N/A",
    },
  ];
  const wsAI = XLSX.utils.json_to_sheet(aiData);
  XLSX.utils.book_append_sheet(wb, wsAI, "AI Test Report");

  // Apply formatting across all sheets
  const sheets = [wsTC, wsER, wsBR, wsAI];
  sheets.forEach((ws) => {
    // Auto-fit column widths (basic estimation)
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      let max = 10;
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const len = String(cell.v).length;
          if (len > max) max = len;
        }
      }
      colWidths.push({ wch: Math.min(max + 2, 50) }); // Cap width at 50 chars
    }
    ws["!cols"] = colWidths;
    
    // Freeze top row
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  });

  const safeName = projectName.replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `FieldNotes_Export_${safeName}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
