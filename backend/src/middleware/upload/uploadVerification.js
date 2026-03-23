const multer = require("multer")
const path = require("path")

const { upload } = require("../../../config")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null,  path.join(upload.base_path, "verification_docs"))
    },

    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        cb(null, uniqueName + path.extname(file.originalname))
    },
})

const fileFilter = (req, file, cb) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "application/msword", "image/png", "image/jpeg", "image/jpg"]

    if (allowed.includes(file?.mimetype)) {
        cb(null, true)
    } else {
        const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)
        error.message = "Only PDF/DOCX/DOC/JPG/JPEG/PNG allowed" // override default message
        cb(error, false)
        return cb(error, false)
    }
}

const uploadVerificationDocumentsMiddleware = (req, res, next) => {
    const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }
    }).array("documents", 5)

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(400).json({ error: err.message })
            }

            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "Maximum file size is 10MB" })
            }
        }

        next() // file uploaded successfully
    })
}

module.exports = { uploadVerificationDocumentsMiddleware }