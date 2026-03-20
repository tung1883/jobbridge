const express = require("express");
const router = express.Router();

const pool = require("../../config/db");
const auth = require("../middleware/auth");
const uploadVerification = require("../middleware/uploadVerification");
const uploadLogo = require("../middleware/uploadLogo");

// 1. job-seeker
// private API (user reads their own profile)
router.get("/candidates/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM candidate_profiles WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.put("/candidates/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE candidate_profiles
      SET full_name = COALESCE($1, full_name),
          location = COALESCE($2, location),
          summary = COALESCE($3, summary)
      WHERE user_id = $4
      RETURNING *`,
      [req.body.full_name, req.body.location, req.body.summary, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// public API (the way the public reads profile)
router.get("/candidates/:id", async (req, res) => {
  try {
    const profileId = req.params.id;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(profileId)) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const result = await pool.query(
      `SELECT id, full_name, location, summary
       FROM candidate_profiles
       WHERE id=$1`,
      [profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// job-seeker
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, description, website, location, logo_url
       FROM companies WHERE id = $1`,  // ← added logo_url
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }
    const company = result.rows[0];
    if (company.logo_url) {
      company.logo_url = `${req.protocol}://${req.get('host')}${company.logo_url}`;
    }
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/companies", auth, async (req, res) => {
  try {
    const { name, description, website, location } = req.body;
    console.log(req.user.id)
    const result = await pool.query(
      `UPDATE companies
       SET name = COALESCE(NULLIF($1,''), name),
           description = COALESCE(NULLIF($2,''), description),
           website = COALESCE(NULLIF($3,''), website),
           location = COALESCE(NULLIF($4,''), location)
       WHERE user_id = $5
       RETURNING *`,
      [name, description, website, location, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.put("/companies/logo", auth, uploadLogo.single("logo"), async (req, res) => {
  try {
    const logoUrl = `/uploads/logos/${req.file.filename}`;
  
    await pool.query(
      `UPDATE companies SET logo_url=$1 WHERE user_id=$2`,
      [logoUrl, req.user.id]
    );
  
    res.json({ logoUrl });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

router.post("/companies/verify", auth, uploadVerification.array("documents", 5),
  async (req, res) => {
    try {
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      if (files.length > 5) {
        return res.status(400).json({ error: "Maximum number of files is 5"})
      }

      const company = await pool.query(
        `SELECT id FROM companies WHERE user_id=$1`,
        [req.user.id]
      );

      if (company.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" });
      }

      const companyId = company.rows[0].id;
      const insertedDocs = [];

      for (const file of files) {
        const filePath = `/uploads/verification_docs/${file.filename}`;

        const result = await pool.query(
          `INSERT INTO company_verification_documents
           (company_id, file_path)
           VALUES ($1,$2)
           RETURNING *`,
          [companyId, filePath]
        );

        insertedDocs.push(result.rows[0]);
      }

      res.json(insertedDocs);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);

router.get("/companies", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM companies WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || {});  // ← return {} instead of undefined
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports  = router;