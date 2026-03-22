const fs = require("fs")
const path = require("path")

const logger = require('../src/utils/log/logger');
const pool   = require('../config/db');
const { randomUUID, randomInt } = require('crypto');

afterAll(async () => {
  await pool.end();
  logger.close();  // terminate worker so Jest can exit
});

const generateTestingEmail = () => {
  return `testuser_${Date.now()}_${randomInt(1000)}_${randomUUID()}@example.com`;
}

const clearFilesInFolder = (folderPath) => {
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


const fakePng = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47, // PNG signature
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    // IHDR chunk (13 bytes)
    0x00,
    0x00,
    0x00,
    0x0d, // length
    0x49,
    0x48,
    0x44,
    0x52, // 'IHDR'
    0x00,
    0x00,
    0x00,
    0x01, // width: 1
    0x00,
    0x00,
    0x00,
    0x01, // height: 1
    0x08, // bit depth
    0x02, // color type: Truecolor
    0x00, // compression
    0x00, // filter
    0x00, // interlace
    0x90,
    0x77,
    0x53,
    0xde, // CRC
    // IDAT chunk (1x1 pixel)
    0x00,
    0x00,
    0x00,
    0x0a, // length
    0x49,
    0x44,
    0x41,
    0x54, // 'IDAT'
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00,
    0x00,
    0x04,
    0x00,
    0x01, // compressed data
    0x02,
    0x50,
    0x5d,
    0xc4, // CRC
    // IEND chunk
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
])

module.exports = {
  generateTestingEmail, fakePng, clearFilesInFolder
};