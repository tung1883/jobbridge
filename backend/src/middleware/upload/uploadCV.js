const multer = require("multer")
const fs = require('fs')
const path = require("path")
const { upload } = require("../../../config")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(upload.base_path, "cvs"))
    },

    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9)
        cb(null, uniqueName + path.extname(file.originalname))
    },
})

const fileFilter = (req, file, cb) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

    if (allowed.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error("Only PDF/DOC/DOCX allowed"), false)
    }
}

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
})
