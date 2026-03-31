const express = require("express")
const pool = require("../../config/db")
const auth = require("../middleware/auth")
const router = express.Router()

const checkRole = require("../middleware/checkRole")

// POST /boomark/:jobId
// for job_seeker to boomark jobs
router.post("/:jobId", auth, checkRole('job_seeker'), async (req, res, next) => {
    try {
        const { jobId } = req.params

        const result = await pool.query(
            `INSERT INTO bookmarked_jobs (user_id, job_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, job_id) DO NOTHING
            RETURNING *`,
            [req.user.id, jobId],
        )

        return res.json(result.rows[0] || { message: "Already saved" })
    } catch (err) {
        next(err)
    }
})

// DELETE /boomark/:jobId
// for job_seeker to delete a job from bookmarkt list
router.delete("/:jobId", auth, checkRole('job_seeker'), async (req, res, next) => {
    try {
        const { jobId } = req.params

        await pool.query(
            `DELETE FROM bookmarked_jobs
            WHERE user_id = $1 AND job_id = $2`,
            [req.user.id, jobId],
        )

        return res.json({ message: "Removed" })
    } catch (err) {
        next(err)
    }
})

// GET /boomark/
// for job_seeker to get their bookmark list (+ job.* + company.name and .description)
router.get("/", auth, checkRole('job_seeker'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT 
                j.*,
                c.name AS company_name,
                c.description AS company_description
            FROM bookmarked_jobs s
            JOIN jobs j ON s.job_id = j.id
            LEFT JOIN companies c ON j.created_by = c.user_id
            WHERE s.user_id = $1
            ORDER BY s.bookmarked_at DESC`,
            [req.user.id],
        )

        return res.json(result.rows)
    } catch (err) {
        next(err)
    }
})

module.exports = router