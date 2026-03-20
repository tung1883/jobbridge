const express = require("express");
const router = express.Router();

const pool = require("../../config/db");
const auth = require("../middleware/auth");
const uploadVerification = require("../middleware/upload/uploadVerification");
const uploadLogo = require("../middleware/upload/uploadLogo");
const checkRole = require("../middleware/checkRole");

// routes: 
// GET /api/v1/profiles/candidates/my
// PUT /api/v1/profiles/candidates/
// GET /api/v1/profiles/candidates/:id
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
router.get("/candidates/my", auth, checkRole('job_seeker'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT full_name, location, summary FROM candidate_profiles WHERE user_id = $1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /candidates/:
// 1. verify access token and get user info from it -> if error, return 401
// 2. take input = {full_name, location, summary} (all optional)
// 3. update candidate_profiles table with user_id -> if error, return 500
// 4. return output = {id, full_name, location, summary}
router.put("/candidates/", auth, checkRole('job_seeker'), async (req, res, next) => {
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
    next(err);
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

// ---- 2. recruiter --------------------
router.put("/companies", auth, checkRole('recruiter'), async (req, res) => {
  try {
    const { name, description, website, location } = req.body;
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

router.put("/companies/logo", auth, checkRole('recruiter'), uploadLogo.single("logo"), async (req, res) => {
  try {
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

router.post("/companies/verify", auth, checkRole('recruiter'), uploadVerification.array("documents", 5), async (req, res) => {
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
      
      // for (const file of files) {
      //   const filePath = `/uploads/verification_docs/${file.filename}`;
        
      //   const result = await pool.query(
      //     `INSERT INTO company_verification_documents
      //     (company_id, file_path)
      //     VALUES ($1,$2)
      //     RETURNING *`,
      //     [companyId, filePath]
      //   );
        
      //   insertedDocs.push(result.rows[0]);
      // }

      // res.json(insertedDocs);

      const values  = files.map((file, i) => `($1, $${i + 2})`).join(', ');
      const paths   = files.map(f => `/uploads/verification_docs/${f.filename}`);
      const result  = await pool.query(
        `INSERT INTO company_verification_documents(company_id, file_path)
        VALUES ${values} RETURNING *`,
        [companyId, ...paths]
      );

      res.status(201).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);

router.get("/companies/my", auth, checkRole('recruiter'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, website, location, logo_url, verification_status FROM companies WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, description, website, location, logo_url
       FROM companies WHERE id = $1`,
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

module.exports  = router;
