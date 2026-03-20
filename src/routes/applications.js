const express = require("express");
const pool = require("../../config/db");
const auth = require("../middleware/auth");
const router = express.Router();

// apply for a job
router.post('/', auth, async (req, res) => {
  try {
    const { job_id, cv_id } = req.body;

    // only job seekers
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ message: "Only job seekers can apply" });
    }

    const cvCheck = await pool.query(
      `SELECT * FROM cvs 
       WHERE id = $1 AND user_id = $2`,
      [cv_id, req.user.id]
    );

    if (cvCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid CV" });
    }

    const cv = cvCheck.rows[0];

    // prevent duplicate apply
    const existing = await pool.query(
      `SELECT * FROM applications 
       WHERE job_id = $1 AND user_id = $2`,
      [job_id, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Already applied" });
    }

    const result = await pool.query(
      `INSERT INTO applications (job_id, user_id, cv_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [job_id, req.user.id, cv.file_path]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// for job_seeker to see the applications
router.get('/my', auth, async (req, res) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `SELECT 
         a.id,
         a.status,
         a.created_at,

         j.title,
         j.location,

         c.name AS company_name

       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN companies c ON j.created_by = c.user_id

       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// for recruiter to view applicants for a job
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { jobId } = req.params;

    const jobCheck = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (jobCheck.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ message: "Not your job" });
    }

    const result = await pool.query(
      `SELECT 
         a.id,
         a.status,
         a.cv_url,
         a.created_at,
         u.email
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.job_id = $1
       ORDER BY a.created_at DESC`,
      [jobId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// recruiter update the application status
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE applications
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;