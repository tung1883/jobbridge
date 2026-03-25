const express = require("express")
const pool = require("../../config/db")
const auth = require("../middleware/auth")
const router = express.Router()

const checkRole = require("../middleware/checkRole")

// apply for a job
router.post("/", auth, checkRole("job_seeker"), async (req, res, next) => {
    try {
        const { job_id, cv_id } = req.body

        // only job seekers
        if (req.user.role !== "job_seeker") {
            return res.status(403).json({ message: "Only job seekers can apply" })
        }

        const cvCheck = await pool.query(
            `SELECT file_name, file_path FROM cvs 
            WHERE id = $1 AND user_id = $2`,
            [cv_id, req.user.id],
        )

        if (cvCheck.rows.length === 0) {
            return res.status(400).json({ message: "Invalid CV" })
        }

        const cv = cvCheck.rows[0]

        // prevent duplicate apply
        const existing = await pool.query(
            `SELECT * FROM applications 
            WHERE job_id = $1 AND user_id = $2`,
            [job_id, req.user.id],
        )

        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "Already applied" })
        }

        const result = await pool.query(
            `INSERT INTO applications (job_id, user_id, cv_url, cv_name, cv_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [job_id, req.user.id, cv.file_path, cv.file_name, cv_id],
        )

        return res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})


// for job_seeker to see the applications
router.get("/my", auth, async (req, res, next) => {
    try {
        if (req.user.role !== "job_seeker") {
            return res.status(403).json({ message: "Forbidden" })
        }

        const result = await pool.query(
            `SELECT 
            a.*,

            j.title,
            j.location,

            c.name AS company_name

            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.created_by = c.user_id

            WHERE a.user_id = $1
            ORDER BY a.created_at DESC`,
            [req.user.id],
        )

        return res.json(result.rows)
    } catch (err) {
        next(err)
    }
})

router.put("/:applicationId/", auth, async (req, res, next) => {
    try {
        const { applicationId } = req.params
        const user_id = req.user.id

        const userCheck = await pool.query(
            'select user_id from applications where id = $1',
            [applicationId]
        )

        if (!userCheck?.rows?.[0]) {
            return res.status(404).json({ error: "Application not found" })
        }

        if (user_id !== userCheck.rows[0].user_id) {
            return res.status(403).json({ error: "Forbidden" })
        }

        const { cv_id } = req.body

        const cvCheck = await pool.query(
            'select file_name, file_path from cvs where id=$1 and user_id=$2',
            [cv_id, user_id]
        )

        if (!cvCheck?.rows?.[0]) {
            return res.status(403).json({ error: "CV not found" })
        }

        const { file_name: cv_name, file_path: cv_url } = cvCheck.rows[0]

        const result = await pool.query(
            `update applications
            set cv_url = coalesce($1, cv_url),
            cv_name = coalesce($2, cv_name),
            cv_id = coalesce($3, cv_id)
            WHERE id = $4
            returning *`,
            [cv_url, cv_name, cv_id, applicationId],
        )

        return res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

router.delete("/:applicationId/", auth, async (req, res, next) => {
    try {
        const { applicationId } = req.params
        const user_id = req.user.id

        const userCheck = await pool.query(
            'select user_id from applications where id = $1',
            [applicationId]
        )

        if (!userCheck?.rows?.[0] || user_id !== userCheck.rows[0].user_id) {
            return res.status(403).json({ error: "Forbidden" })
        }

        await pool.query(
            `delete from applications
            WHERE id = $1`,
            [applicationId]
        )

        return res.json({ "message": "Your application deleted!"})
    } catch (err) {
        next(err)
    }
})

// for recruiter to view applicants for a job
router.get("/job/:jobId", auth, checkRole("recruiter"), async (req, res, next) => {
    try {
        const { jobId } = req.params

        const jobCheck = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [jobId])

        if (jobCheck.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" })
        }

        if (jobCheck.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ message: "Not your job" })
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
            [jobId],
        )

        return res.json(result.rows)
    } catch (err) {
        next(err)
    }
})

// recruiter update the application status
router.put("/:id/status", auth, checkRole("recruiter"), async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const result = await pool.query(
            `UPDATE applications
            SET status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *`,
            [status, id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Application not found" })
        }

        return res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

module.exports = router
