const express = require("express")
const router = express.Router()

const auth = require("../middleware/auth")
const { uploadVerificationDocumentsMiddleware } = require("../middleware/upload/uploadVerification")
const { uploadLogoMiddleware } = require("../middleware/upload/uploadLogo")
const checkRole = require("../middleware/checkRole")
const {
    getMyCandidateProfile,
    updateMyCandidateProfile,
    readCandidateProfileById,
    updateCompanyProfile,
    updateCompanyLogo,
    uploadCompanyVerificationDocs,
    getMyCompanyProfile,
    getCompanyProfileById,
    getCompanyVerificationDocs,
    deleteCompanyVerificationDocs,
    editCompanyVerificationDoc,
} = require("../controllers/profiles.controller")

// routes:
// ---- 1. job-seeker --------------------
// GET /api/v1/profiles/candidates/my
// PUT /api/v1/profiles/candidates/
// GET /api/v1/profiles/candidates/:id
//
// ---- 2. recruiter --------------------
// GET /api/v1/profiles/companies/:id
// PUT /api/v1/profiles/companies
// PUT /api/v1/profiles/companies/logo
// POST /api/v1/profiles/companies/verify
// GET /api/v1/profiles/companies/my (for recruiter to view their own company profile)

// ---- 1. job-seeker --------------------

// GET /candidates/my:
// 1. verify access token and get user info from it -> if error, return 401
// 2. query candidate_profiles table with user_id -> if error, return 500
// 3. return output = {id, full_name, location, summary}
router.get("/candidates/my", auth, checkRole("job_seeker"), getMyCandidateProfile)

// PUT /candidates/:
// 1. verify access token and get user info from it -> if error, return 401
// 2. take input = {full_name, location, summary} (all optional)
// 3. update candidate_profiles table with user_id -> if error, return 500
// 4. return output = {id, full_name, location, summary}
router.put("/candidates/", auth, checkRole("job_seeker"), updateMyCandidateProfile)

// GET /candidates/:id: (public API for recruiter to view candidate profile)
// input: profile id in URL path, output: {id, full_name, location, summary}
// 1. validate profile UUID -> if invalid, return 404 with json { error: "Profile not found" }
// 2. query candidate_profiles table with id
//  -> if not found, return 404 with json { error: "Profile not found" }, if error, return 500
// 3. return output = {id, full_name, location, summary}
router.get("/candidates/:id", readCandidateProfileById)

// ---- 2. recruiter --------------------
// PUT /companies:
// 1. verify access token and get user info from it -> if error, return 401
// 2. check if user role is recruiter -> if not, return 403
// 3. take input = {name, description, website, location} (all optional)
// 4. update companies table with user_id -> if error, return 404 with json { error: "Company not found"} or 500
// 5. return output = { name, verification_status, description, website, location }
// *note: to update logo, use separate endpoint PUT /companies/logo
router.put("/companies", auth, checkRole("recruiter"), updateCompanyProfile) // implemented in controllers/profiles.controller.js

// PUT /companies/logo:
// 1. verify access token and get user info from it -> if error, return 401
// 2. check if user role is recruiter -> if not, return 403
// 3. take input = form-data with key "logo" and value is the image file
// 4. save the uploaded file to disk and get the file path -> if error, return 400 with json { error: "No file uploaded" } or 500
// 5. update companies table with logo_url = file path -> if error, return 404 with json { error: "Company not found"} or 500
// 6. return output = { logoUrl }
router.put("/companies/logo", auth, checkRole("recruiter"), uploadLogoMiddleware, updateCompanyLogo)

// POST /companies/verify:
// 1. verify access token and get user info from it -> if error, return 401
// 2. check if user role is recruiter -> if not, return 403
// 3. take input = form-data with key "documents" and value is an array of image files (max 5 files)
// 4. save the uploaded files to disk and get the file paths -> if error, return 400 with json { error: "No files uploaded" } or { error: "Maximum number of files is 5"} or 500
// 5. insert a new record into company_verification_documents table for each uploaded file with company_id (get from companies table using user_id) and file_path -> if error, return 404 with json { error: "Company not found"} or 500
// 6. return output = [{ id, company_id, file_path, uploaded_at }]
router.post("/companies/verify", auth, checkRole("recruiter"), uploadVerificationDocumentsMiddleware, uploadCompanyVerificationDocs)
router.get("/companies/verify", auth, checkRole("recruiter"), getCompanyVerificationDocs)
router.delete("/companies/verify", auth, checkRole("recruiter"), deleteCompanyVerificationDocs)
router.put("/companies/verify/:id", auth, checkRole("recruiter"), uploadVerificationDocumentsMiddleware, editCompanyVerificationDoc)

// GET /companies/my:
// 1. verify access token and get user info from it -> if error, return 401
// 2. check if user role is recruiter -> if not, return 403
// 3. query companies table with user_id -> if error, return 500
// 4. return output = {id, name, description, website, location, logo_url, verification_status}
router.get("/companies/my", auth, checkRole("recruiter"), getMyCompanyProfile)

// GET /companies/:id: (public API for job-seeker to view company profile)
// input: company id in URL path, output: {id, name, description, website, location, logo_url}
// 1. validate company UUID -> if invalid, return 404 with json { error: "Company not found" }
// 2. query companies table with id
//  -> if not found, return 404 with json { error: "Company not found" }, if error, return 500
// 3. return output = {id, name, description, website, location, logo_url}
router.get("/companies/:id", getCompanyProfileById)

module.exports = router
