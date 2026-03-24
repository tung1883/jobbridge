const path = require("path")

const pool = require("../../config/db")
const { upload } = require("../../config")

const { isUUID } = require("../utils/validateUUID")

const PROFILE_TABLES = ["candidate_profiles", "companies"]
const candidate_cols = ["id", "full_name", "location", "summary", "avatar_url"]
const company_cols = ["id", "name", "description", "website", "location", "logo_url", "verification_status"]

const getProfile = async ({ profile_type, excludedColumns = [], user_id, profile_id = null }) => {
    try {
        if (profile_id && !isUUID(profile_id)) {
            throw { message: "Invalid Profile UUID" }
        }

        const table = profile_type === "job_seeker" ? PROFILE_TABLES[0] : PROFILE_TABLES[1]

        const columns = profile_type === "job_seeker" ? candidate_cols : company_cols

        const filteredCols = columns.filter((col) => !excludedColumns.includes(col))

        if (filteredCols.length === 0) {
            throw new Error("No columns left to select")
        }

        if (user_id && profile_id) {
            throw new Error("Can only accept user_id or profile_id")
        }

        if (!user_id && !profile_id) {
            throw new Error("No ID provided")
        }

        const idValue = user_id || profile_id
        const idColumn = user_id ? "user_id" : "id"

        const sql = `SELECT ${filteredCols.join(", ")}
            FROM ${table}
            WHERE ${idColumn} = '${idValue}'` // note: idValue can be UUID -> must be quoted

        const result = await pool.query(sql)

        return result.rows[0] || null
    } catch (err) {
        throw err
    }
}

const updateProfile = async ({ profile_type, data = {}, user_id }) => {
    if (!user_id) {
        throw new Error("No ID provided")
    }

    let result

    if (profile_type == "job_seeker") {
        const { full_name, location, summary } = data
        result = await pool.query(
            `UPDATE candidate_profiles
            SET full_name = COALESCE($1, full_name),
            location = COALESCE($2, location),
            summary = COALESCE($3, summary)
            WHERE user_id = $4
            RETURNING *`,
            [full_name, location, summary, user_id],
        )
    } else if (profile_type == "recruiter") {
        const { name, description, website, location, industry } = data

        result = await pool.query(
            `UPDATE companies
            SET name = COALESCE(NULLIF($1,''), name),
            description = COALESCE(NULLIF($2,''), description),
            website = COALESCE(NULLIF($3,''), website),
            location = COALESCE(NULLIF($4,''), location),
            industry = COALESCE(NULLIF($5, ''), industry)
            WHERE user_id = $6
            RETURNING name, verification_status, description, website, location`,
            [name, description, website, location, industry, user_id],
        )
    }

    return result.rows[0] || null
}

const storeAvatarToDB = async ({ user_id, avatarUrl }) => {
    await pool.query(`UPDATE candidate_profiles SET avatar_url=$1 WHERE user_id=$2`, [avatarUrl, user_id])
}

const deleteAvatarFromDB = async ({ user_id }) => {
    await pool.query(`UPDATE candidate_profiles SET avatar_url = NULL WHERE user_id = $1`, [user_id])
}

const storeLogoToDB = async ({ user_id, logoUrl }) => {
    await pool.query(`UPDATE companies SET logo_url=$1 WHERE user_id=$2`, [logoUrl, user_id])
}

const storeVerificationDocsToDB = async ({ companyId, files }) => {
    const values = files.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(", ")

    const params = files.flatMap((f) => {
        const filePath = path.join(upload.base_path, `verification_docs/${f.filename}`)
        const documentType = path.extname(f.originalname).slice(1).toLowerCase()
        const fileName = f.originalname

        return [filePath, documentType, fileName]
    })

    return (
        await pool.query(
            `INSERT INTO company_verification_documents
            (company_id, file_path, document_type, file_name)
            VALUES ${values}
            RETURNING id, document_type, file_path, file_name`,
            [companyId, ...params],
        )
    ).rows
}

const getVerificationDocs = async ({ companyId }) => {
    return (
        await pool.query(
            `SELECT id, file_name, file_path, document_type, uploaded_at
             FROM company_verification_documents
             WHERE company_id = $1
             ORDER BY uploaded_at ASC`,
            [companyId],
        )
    ).rows
}

const deleteVerificationDocs = async ({ docs, company_id }) => {
    if (!docs || docs.length === 0) return 0

    const result = await pool.query(
        `DELETE FROM company_verification_documents
         WHERE id = ANY($1)
         AND company_id = $2
         RETURNING id`,
        [docs, company_id],
    )

    const deletedCount = result.rowCount

    // no docs -> reset verification status to 'unverified'
    if (deletedCount > 0) {
        const remaining = await pool.query(`SELECT COUNT(*) FROM company_verification_documents WHERE company_id = $1`, [company_id])

        if (parseInt(remaining.rows[0].count, 10) === 0) {
            await pool.query(`UPDATE companies SET verification_status = 'unverified' WHERE id = $1`, [company_id])
        }
    }

    return deletedCount
}

const editVerificationDoc = async ({ id, file_path, file_name }) => {
    if (!id && !file_name) {
        throw new Error("file id and file_name are required")
    }

    const query = `
        UPDATE company_verification_documents
        SET
        file_name = COALESCE($1, file_name),
        file_path = COALESCE($2, file_path)
        WHERE id = $3
        RETURNING id, file_name, file_path, document_type, uploaded_at
    `
    const values = [file_name, file_path, id]
    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
        throw new Error("Verification document not found")
    }

    return result.rows[0]
}

module.exports = {
    getProfile,
    updateProfile,
    storeAvatarToDB,
    deleteAvatarFromDB,
    storeLogoToDB,
    storeVerificationDocsToDB,
    getVerificationDocs,
    deleteVerificationDocs,
    editVerificationDoc,
}
