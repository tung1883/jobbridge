const express = require("express")
const pool = require("../../config/db")
const auth = require("../middleware/auth")
const checkRole = require("../middleware/checkRole")
const { validate, schemas } = require("../utils/validate")
const { getProfile } = require("../services/profiles.services")

const router = express.Router()

// | Method | Path                          |
// | ------ | ----------------------------- |
// | GET    | /api/v1/jobs/my               |
// | GET    | /api/v1/jobs                  |
// | POST   | /api/v1/jobs                  |
// | PUT    | /api/v1/jobs/:id              |
// | GET    | /api/v1/jobs/:id/company      |

router.get("/my", auth, checkRole('recruiter'), async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT * FROM jobs
            WHERE created_by = $1
            ORDER BY created_at DESC`,
            [req.user.id],
        )

        res.json(result.rows)
    } catch (err) {
        next(err)
    }
})

router.get("/", async (req, res, next) => {
    try {
        const { search, location, job_type, minSalary, maxSalary } = req.query
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const offset = (page - 1) * limit
        let values = []
        // let query = `
        //     SELECT *,
        //     ${search ? `ts_rank(search_vector, plainto_tsquery('english', $1))` : `0`} AS rank
        //     FROM jobs
        //     WHERE 
        //         (publishing_date IS NULL OR publishing_date <= NOW())
        //     AND
        //         (application_deadline IS NULL OR application_deadline >= NOW())
        // `

        let query = `
            SELECT j.*,
            ${search ? `ts_rank(j.search_vector, plainto_tsquery('english', $1))` : `0`} AS rank,
            c.name AS company_name
            FROM jobs j
            LEFT JOIN users u ON u.id = j.created_by
            LEFT JOIN companies c ON c.user_id = u.id
            WHERE 
                (j.publishing_date IS NULL OR j.publishing_date <= NOW())
            AND
                (j.application_deadline IS NULL OR j.application_deadline >= NOW())
        `

        if (search && search.trim()) {
            values.push(search)
            query += `
                AND search_vector @@ plainto_tsquery('english', $${values.length})
            `
        }

        if (location) {
            values.push(location)
            query += `
                AND location ILIKE '%' || $${values.length} || '%'
            `
        }

        if (job_type) {
            values.push(job_type)
            query += `
                AND job_type = $${values.length}
            `
        }

        if (minSalary) {
            values.push(minSalary)
            query += `
                AND salary_min >= $${values.length}
            `
        }

        if (maxSalary) {
            values.push(maxSalary)
            query += `
                AND salary_max <= $${values.length}
            `
        }

        query += `
        ORDER BY rank DESC, created_at DESC
        `

        values.push(limit)
        query += ` LIMIT $${values.length}`

        values.push(offset)
        query += ` OFFSET $${values.length}`

        const result = await pool.query(query, values)

        res.json({
            page,
            limit,
            data: result.rows,
        })
    } catch (err) {
        next(err)
    }
})

// POST /jobs/: input = job details, output the job after created
// 1. check auth, only for recruiter
// 2. validate the job description
// 3. check if company is verified
// 4. add the job, return job
router.post("/", auth, checkRole("recruiter"), validate(schemas.job), async (req, res, next) => {
    try {
        const checkVerified = await getProfile({
            profile_type: "recruiter",
            excludedColumns: ["id", "name", "description", "website", "location", "logo_url"],
            user_id: req.user.id,
        })

        if (checkVerified?.verification_status !== "verified") {
            return res.status(403).json({ message: "Company not verified" })
        }

        const result = await pool.query(
            `INSERT INTO jobs (
                title, description, responsibilities, required_qualifications,
                salary_min, salary_max, currency,
                location, job_type,
                publishing_date, application_deadline,
                created_by
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
            ) RETURNING *`,
            [
                req.body.title,
                req.body.description,
                req.body.responsibilities,
                req.body.required_qualifications,
                req.body.salary_min,
                req.body.salary_max,
                req.body.currency,
                req.body.location,
                req.body.job_type,
                req.body.publishing_date,
                req.body.application_deadline,
                req.user.id,
            ],
        )

        res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

router.put("/:id", auth, checkRole('recruiter'), async (req, res, next) => {
    try {
        const { id } = req.params
        const job = await pool.query("SELECT * FROM jobs WHERE id=$1", [id])

        if (job.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" })
        }

        if (job.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ message: "Not your job post" })
        }

        const result = await pool.query(
            `UPDATE jobs SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            responsibilities = COALESCE($3, responsibilities),
            required_qualifications = COALESCE($4, required_qualifications),
            salary_min = COALESCE($5, salary_min),
            salary_max = COALESCE($6, salary_max),
            currency = COALESCE($7, currency),
            location = COALESCE($8, location),
            job_type = COALESCE($9, job_type),
            publishing_date = COALESCE($10, publishing_date),
            application_deadline = COALESCE($11, application_deadline),
            updated_at = NOW()
            WHERE id = $12
            RETURNING *`,
            [
                req.body.title ?? null,
                req.body.description ?? null,
                req.body.responsibilities ?? null,
                req.body.required_qualifications ?? null,
                req.body.salary_min ?? null,
                req.body.salary_max ?? null,
                req.body.currency ?? null,
                req.body.location ?? null,
                req.body.job_type ?? null,
                req.body.publishing_date ?? null,
                req.body.application_deadline ?? null,
                id,
            ],
        )

        res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

router.delete("/:id", auth, checkRole('recruiter'), async (req, res, next) => {
    try {
        const { id } = req.params
        const job = await pool.query("SELECT * FROM jobs WHERE id=$1", [id])

        if (job.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" })
        }

        if (job.rows[0].created_by !== req.user.id) {
            return res.status(403).json({ message: "Not your job post" })
        }

        await pool.query(
            `DELETE FROM jobs
            WHERE id = $1`,
            [id],
        )

        res.json({ message: "Job deleted"})
    } catch (err) {
        next(err)
    }
})

// get job info 
router.get("/:id/", async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await pool.query(
            `SELECT 
                j.id,
                j.title, 
                j.description, 
                j.responsibilities, 
                j.required_qualifications, 
                j.salary_min, 
                j.salary_max, 
                j.currency,
                j.location AS job_location, 
                j.job_type, 
                j.publishing_date,
                j.application_deadline
            FROM jobs j
            WHERE j.id = $1`,
            [id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" })
        }

        return res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

// this function is for when job_seeker see a job and wanna see the company info
router.get("/:id/company", async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await pool.query(
            `SELECT 
            c.id,
            c.name,
            c.description,
            c.website,
            c.location,
            c.logo_url
            FROM jobs j
            JOIN companies c ON j.created_by = c.user_id
            WHERE j.id = $1`,
            [id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Company not found" })
        }

        const company = result.rows[0]

        res.json(company)
    } catch (err) {
        next(err)
    }
})

module.exports = router
