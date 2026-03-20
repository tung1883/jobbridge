const express = require("express");
const pool = require("../../config/db");
const auth = require("../middleware/auth");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();

function parseCVs(cvPaths, applicants) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ cv_paths: cvPaths, applicants });
    // const PYTHON = path.join(__dirname, "../resume-ai/.venv/Scripts/python.exe");
    const PYTHON = "C:\\Users\\Tung\\Documents\\work\\resume-ai\\.venv\\Scripts\\python.exe";
    const py = spawn(PYTHON, [
    path.join(__dirname, "../parse_bridge.py"),
    payload
    ]);
    let stdout = "", stderr = "";
    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { stderr += d.toString(); });
    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Parser error: ${stderr}`));
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error("Invalid parser response")); }
    });
  });
}

// Helper: call Python daemon via bridge.py
function callDaemon(data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const py = spawn("python", [
      path.join(__dirname, "../bridge.py"),
      payload
    ]);

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { stderr += d.toString(); });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Daemon error: ${stderr}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error("Invalid response from daemon"));
      }
    });
  });
}

// GET /ranking/:job_id — rank applicants for a job
router.get("/:job_id", auth, async (req, res) => {
  try {
    console.log(req.params.job_id)
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { job_id } = req.params;

    // 1. Get job
    const jobResult = await pool.query(
      `SELECT title, description, responsibilities, required_qualifications
       FROM jobs WHERE id = $1`, [job_id]
    );
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }
    const job = jobResult.rows[0];

    // 2. Get applicants + CV paths
    const appResult = await pool.query(
      `SELECT a.id, a.status, a.cv_url, a.created_at,
              u.email, cp.full_name
       FROM applications a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.user_id
       WHERE a.job_id = $1`, [job_id]
    );

    if (appResult.rows.length === 0) return res.json([]);

    const applicants = appResult.rows;
    const cvPaths = applicants.map(a =>
      a.cv_url ? a.cv_url.replace(/\\/g, "/") : null
    );

    // 3. Build job text
    const jobText = [
      job.title, job.description,
      job.responsibilities, job.required_qualifications
    ].filter(Boolean).join("\n");

    // 4. Parse CVs (runs in BE process, has access to uploads folder)
    const parsedResumes = await parseCVs(cvPaths, applicants.map(a => ({
      email: a.email,
      full_name: a.full_name
    })));

    // 5. Send parsed data to daemon for ranking
    const ranked = await callDaemon({
      resumes: parsedResumes,
      job_text: jobText
    });

    console.log(ranked)
    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;