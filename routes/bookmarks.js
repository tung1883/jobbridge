const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

router.post('/saved', auth, async (req, res) => {
  try {
    const { job_id } = req.body;

    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `INSERT INTO saved_jobs (user_id, job_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, job_id) DO NOTHING
       RETURNING *`,
      [req.user.id, job_id]
    );

    res.json(result.rows[0] || { message: "Already saved" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete('/saved/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;

    await pool.query(
      `DELETE FROM saved_jobs
       WHERE user_id = $1 AND job_id = $2`,
      [req.user.id, jobId]
    );

    res.json({ message: "Removed" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         j.id,
         j.title,
         j.location,
         j.created_at,
         c.name AS company_name
       FROM saved_jobs s
       JOIN jobs j ON s.job_id = j.id
       LEFT JOIN companies c ON j.created_by = c.user_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
