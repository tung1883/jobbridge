const path = require("path")

const pool = require("../../config/db")
const {
    getProfile,
    updateProfile,
    storeLogoToDB,
    storeVerificationDocsToDB,
    getVerificationDocs,
    deleteVerificationDocs,
    editVerificationDoc,
} = require("../services/profiles.services")
const { isUUID } = require("../utils/validateUUID")
const { upload, industries } = require("../../config")

const getMyCandidateProfile = async (req, res, next) => {
    try {
        const { role, id: user_id } = req.user
        const profile = await getProfile({ profile_type: role, user_id })

        if (!profile) {
            return res.status(404).json({ message: "Profile not found" })
        }

        res.json(profile)
    } catch (err) {
        next(err)
    }
}

const updateMyCandidateProfile = async (req, res, next) => {
    try {
        result = await updateProfile({
            profile_type: "job_seeker",
            data: req.body,
            user_id: req.user.id,
        })

        if (result === 0) {
            return res.status(404).json({ error: "Candidate not found" })
        }

        return res.json(result)
    } catch (err) {
        next(err)
    }
}

const readCandidateProfileById = async (req, res, next) => {
    try {
        const profileId = req.params.id

        if (!isUUID(profileId)) {
            return res.status(404).json({ error: "Profile not found" })
        }

        const profile = await getProfile({ profile_type: "job_seeker", profile_id: profileId })

        if (!profile) {
            return res.status(404).json({ error: "Profile not found" })
        }

        res.json(profile)
    } catch (err) {
        next(err)
    }
}

// ---- 2. recruiter --------------------
// *note: to update logo, use function updateCompanyLogo
const updateCompanyProfile = async (req, res, next) => {
    try {
        const result = await updateProfile({
            profile_type: "recruiter",
            data: req.body,
            user_id: req.user.id,
        })

        if (req?.body?.industry && !industries.includes(req?.body?.industry)) {
            return res.status(400).json({ error: "Industry not included"})
        }

        if (!result) {
            return res.status(404).json({ error: "Company not found" })
        }

        res.json(result)
    } catch (err) {
        next(err)
    }
}

const updateCompanyLogo = async (req, res, next) => {
    try {
        if (!req?.file) {
            return res.status(400).json({ error: "No file uploaded" })
        }

        const logoUrl = path.join(upload.base_path, `/logos/${req.file.filename}`)
    
        await storeLogoToDB({ user_id: req.user.id, logoUrl })
        
        res.status(201).json({ logoUrl })
    } catch (err) {
        next(err)
    }
}

const uploadCompanyVerificationDocs = async (req, res, next) => {
    try {
        const files = req.files

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" })
        }

        if (files.length > 5) {
            return res.status(400).json({ error: "Maximum number of files is 5" })
        }

        const company = await pool.query(`SELECT id FROM companies WHERE user_id=$1`, [req.user.id])

        if (company.rows.length === 0) {
            return res.status(404).json({ error: "Company not found" })
        }

        const companyId = company.rows[0].id
        const result = await storeVerificationDocsToDB({ companyId, files })
        res.status(201).json(result)
    } catch (err) {
        next(err)
    }
}

const getCompanyVerificationDocs = async (req, res, next) => {
    try {
        const company = await pool.query(`SELECT id FROM companies WHERE user_id=$1`, [req.user.id])

        if (company.rows.length === 0) {
            return res.status(404).json({ error: "Company not found" })
        }
        
        return res.json(await getVerificationDocs({ companyId: company.rows[0].id }))
    } catch (err) {
        next(err)
    }
}

const deleteCompanyVerificationDocs = async (req, res, next) => {
    try {
        const { docs } = req.body

        if (!docs || docs?.length === 0) {
            return res.status(404).json({ error: "There must be at least a document" })
        }

        const company = await pool.query(`SELECT id FROM companies WHERE user_id=$1`, [req.user.id])

        if (company.rows.length === 0) {
            return res.status(404).json({ error: "Company not found" })
        }

        const totalFilesDeleted = await deleteVerificationDocs({ docs, company_id: company.rows[0].id })

        return res.json({ "message": `Total files deleted are ${totalFilesDeleted}`})
    } catch (err) {
        next(err)
    }
}

const editCompanyVerificationDoc = async (req, res, next) => {
    try {
        // if update name -> only change name in DB
        // if update file -> change name, change path
        const id = req.params.id
        let file_name, file_path

        if (req?.files) { //update file
            const file = req.files[0]
            file_name = file.originalname
            file_path = file.path
        } else {
            file_name = req.body.file_name
        }

        return res.json(await editVerificationDoc({ id, file_name, file_path }))
    } catch (err) {
        next(err)
    }
}

const getMyCompanyProfile = async (req, res, next) => {
    try {
        const profile = await getProfile({ profile_type: req.user.role, user_id: req.user.id })
        res.json(profile)
    } catch (err) {
        next(err)
    }
}

const getCompanyProfileById = async (req, res, next) => {
    try {
        const { id } = req.params
        const profile = await getProfile({ profile_type: "recruiter", profile_id: id })

        if (!profile) {
            return res.status(404).json({ message: "Company not found" })
        }

        if (profile.logo_url) {
            profile.logo_url = `${req.protocol}://${req.get("host")}${profile.logo_url}`
        }
        
        res.json(profile)
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getMyCandidateProfile,
    updateMyCandidateProfile,
    readCandidateProfileById,
    updateCompanyProfile,
    updateCompanyLogo,
    uploadCompanyVerificationDocs,
    getCompanyVerificationDocs,
    deleteCompanyVerificationDocs,
    editCompanyVerificationDoc,
    getMyCompanyProfile,
    getCompanyProfileById,
}
