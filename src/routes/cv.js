const fs = require("fs");
const express = require("express");
const router = express.Router();

const pool = require("../../config/db");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadCV");

router.post("/", auth, upload.single("cv"), async (req, res) => {
  try {
    const userId = req.user.id;
    const fileName = req.file.originalname;
    const filePath = req.file.path;

    const result = await pool.query(
      `INSERT INTO cvs (user_id, file_name, file_path)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [userId, fileName, filePath]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.get("/", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
          `SELECT id, file_name, uploaded_at
           FROM cvs
           WHERE user_id=$1`,
          [userId]
        );
      
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

router.get("/:id", auth, async (req, res) => {
  const cvId = req.params.id;
  const result = await pool.query(
    `SELECT * FROM cvs WHERE id=$1`,
    [cvId]
  );

  if (result.rows.length === 0) {
    return res.status(404).send("CV not found");
  }

  res.sendFile(result.rows[0].file_path, { root: "." });

});

router.put("/:id", auth, upload.single("cv"), async (req, res) => {
  const cvId = req.params.id;
  const fileName = req.file.originalname;
  const filePath = req.file.path;

  const result = await pool.query(
    `UPDATE cvs
     SET file_name=$1,
         file_path=$2
     WHERE id=$3
     RETURNING *`,
    [fileName, filePath, cvId]
  );

  res.json(result.rows[0]);

});

router.delete("/:id", auth, async (req, res) => {
  try {
    const cvId = req.params.id;
    const result = await pool.query(
      `SELECT file_path FROM cvs WHERE id=$1`,
      [cvId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "CV not found" });
    }

    const filePath = result.rows[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query(
      `DELETE FROM cvs WHERE id=$1`,
      [cvId]
    );

    res.json({ message: "CV deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;