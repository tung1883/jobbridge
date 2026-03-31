const fs = require("fs")
const path = require("path")
const express = require("express")
const router = express.Router()
const pool = require("../../config/db")
const auth = require("../middleware/auth")

const sendFile = (res, filePath, downloadName) => {
    const resolved = path.resolve(filePath)

    if (!fs.existsSync(resolved)) {
        return res.status(404).json({ error: "File not found on disk" })
    }

    res.download(resolved, downloadName || path.basename(resolved))
}

router.get("/cv/:id", auth, async (req, res) => {
    try {
        const result = await pool.query(`SELECT file_path, file_name, user_id FROM cvs WHERE id = $1`, [req.params.id])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "CV not found" })
        }

        const cv = result.rows[0]

        if (cv.user_id !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to download this CV" })
        }

        sendFile(res, cv.file_path, cv.file_name)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

router.get("/verification/:docId", auth, async (req, res) => {
    try {
        const docResult = await pool.query(
            `SELECT cvd.file_path, cvd.file_name, cvd.company_id
             FROM company_verification_documents cvd
             WHERE cvd.id = $1`,
            [req.params.docId],
        )

        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: "Verification document not found" })
        }

        const doc = docResult.rows[0]

        // admins can access any doc; recruiters only their own
        if (req.user.role !== "admin") {
            const companyResult = await pool.query(`SELECT id FROM companies WHERE user_id = $1`, [req.user.id])

            if (companyResult.rows.length === 0 || companyResult.rows[0].id !== doc.company_id) {
                return res.status(403).json({ error: "You don't have permission to download this document" })
            }
        }

        sendFile(res, doc.file_path, doc.file_name)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

module.exports = router
