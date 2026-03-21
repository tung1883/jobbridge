const path = require('path')

const pool = require("../../config/db")
const { upload } = require("../../config")

const { isUUID } = require("../utils/validateUUID")

const PROFILE_TABLES = ["candidate_profiles", "companies"]
const candidate_cols = ["id", "full_name", "location", "summary"]
const company_cols = ["id", "name", "description", "website", "location", "logo_url", "verification_status"]

const getProfile = async ({ profile_type, excludedColumns = [], user_id, profile_id=null }) => {
    try {
        if (profile_id && !isUUID(profile_id)) {
            throw { message: "Invalid Profile UUID"}
        }
    
        const table = profile_type === "job_seeker" 
            ? PROFILE_TABLES[0] 
            : PROFILE_TABLES[1]
        
        const columns = profile_type === "job_seeker" 
            ? candidate_cols 
            : company_cols
        
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
    } else if (profile_type == 'recruiter') {
        const { name, description, website, location } = data
        result = await pool.query(
            `UPDATE companies
            SET name = COALESCE(NULLIF($1,''), name),
            description = COALESCE(NULLIF($2,''), description),
            website = COALESCE(NULLIF($3,''), website),
            location = COALESCE(NULLIF($4,''), location)
            WHERE user_id = $5
            RETURNING name, verfication_status, description, website, location`,
            [name, description, website, location, user_id],
        )
    }

    return result.rows[0] || null
}

const storeLogoToDB = async ({ user_id, logoUrl }) => {
    await pool.query(`UPDATE companies SET logo_url=$1 WHERE user_id=$2`, [logoUrl, user_id])
}

const storeVerificationDocsToDB = async ({ companyId, files }) => {
    const values = files.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(", ")

    const params = files.flatMap((f) => {
        const filePath = path.join(upload.base_path, `verification_docs/${f.filename}`)
        const documentType = path.extname(f.originalname).slice(1).toLowerCase()
        return [filePath, documentType]
    })

    return (await pool.query(
        `INSERT INTO company_verification_documents(company_id, file_path, document_type)
        VALUES ${values}
        RETURNING document_type, file_path`,
        [companyId, ...params],
    )).rows
}

module.exports = { getProfile, updateProfile, storeLogoToDB, storeVerificationDocsToDB } 
