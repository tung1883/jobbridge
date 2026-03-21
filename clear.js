const fs = require("fs")
const path = require("path")

function clearFilesInFolder(folderPath) {
    if (!fs.existsSync(folderPath)) return

    const items = fs.readdirSync(folderPath)
    for (const item of items) {
        const itemPath = path.join(folderPath, item)
        const stat = fs.lstatSync(itemPath)

        if (stat.isFile()) {
            fs.unlinkSync(itemPath) // delete file
        } else if (stat.isDirectory()) {
            // recursively clear files inside subfolder
            clearFilesInFolder(itemPath)
        }
    }
}

// Example usage
clearFilesInFolder("./uploads_test")
