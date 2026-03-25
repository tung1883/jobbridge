const express = require("express")
const router = express.Router()

const pool = require("../../config/db")
const auth = require("../middleware/auth")
const upload = require("../middleware/upload/uploadCV")

router.post("/", auth, upload.single("cv"), async (req, res) => {
    try {
        const userId = req.user.id
        const fileName = req.file.originalname
        const filePath = req.file.path

        const result = await pool.query(
            `INSERT INTO cvs (user_id, file_name, file_path)
            VALUES ($1,$2,$3)
            RETURNING *`,
            [userId, fileName, filePath],
        )

        return res.json(result.rows[0])
    } catch (err) {
        next(err)
    }
})

router.get("/", auth, async (req, res) => {
    try {
        const userId = req.user.id
        const result = await pool.query(
            `SELECT id, file_name, file_path, uploaded_at
            FROM cvs
            WHERE user_id=$1`,
            [userId],
        )

        return res.json(result.rows)
    } catch (err) {
        next(err)
    }
})

router.get("/:id", auth, async (req, res) => {
    const cvId = req.params.id
    const result = await pool.query(`SELECT * FROM cvs WHERE id=$1`, [cvId])

    if (result.rows.length === 0) {
        return res.status(404).send("CV not found")
    }

    return res.sendFile(result.rows[0].file_path, { root: "." })
})

router.put("/:id", auth, upload.single("cv"), async (req, res) => {
    const cvId = req.params.id
    const fileName = req.file.originalname
    const filePath = req.file.path

    const result = await pool.query(
        `UPDATE cvs
        SET file_name=$1,
            file_path=$2
        WHERE id=$3
        RETURNING *`,
        [fileName, filePath, cvId],
    )

    return res.json(result.rows[0])
})

// *note: DELETE will just values in cvs, not the stored in file so that applications still working correctly
// if the cv is not in any applications, it will be deleted by cron worker
router.delete("/:id", auth, async (req, res) => {
    try {
        const cvId = req.params.id
        const result = await pool.query(`SELECT file_path FROM cvs WHERE id=$1`, [cvId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "CV not found" })
        }

        await pool.query(`DELETE FROM cvs WHERE id=$1`, [cvId])

        return res.json({ message: "CV deleted" })
    } catch (err) {
        next(err)
    }
})

module.exports = router
