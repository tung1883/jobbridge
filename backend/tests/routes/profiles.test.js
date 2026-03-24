const fs = require("fs")
const path = require("path")
const request = require("supertest")

const app = require("../../src/app")
const pool = require("../../config/db")
const { generateTestingEmail, fakePng, clearFilesInFolder } = require("../setup")
const { upload } = require("../../config")
const { reset } = require("supertest/lib/cookies")

const registerUser = (data = {}) =>
    request(app)
        .post("/api/v1/auth/register")
        .set("User-Agent", "Jest Test Runner")
        .send({
            email: "john@test.com",
            password: "Password1!",
            role: "job_seeker",
            ...data,
        })

const loginUser = (data = {}) =>
    request(app)
        .post("/api/v1/auth/login")
        .set("User-Agent", "Jest Test Runner")
        .send({
            email: "john@test.com",
            password: "Password1!",
            ...data,
        })

afterEach(async () => {
    await pool.query("DELETE FROM company_verification_documents")
    await pool.query("DELETE FROM refresh_tokens")
    await pool.query("DELETE FROM candidate_profiles")
    await pool.query("DELETE FROM companies")
    await pool.query("DELETE FROM users")
    
    clearFilesInFolder(upload.base_path)
})

describe("GET /profiles/candidates/my", () => {
    test("returns 401 when no token provided", async () => {
        const res = await request(app).get("/api/v1/profiles/candidates/my").set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(401)
        expect(res.body.message).toBe("No token provided")
    })

    test("returns 403 for recruiter token", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .get("/api/v1/profiles/candidates/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(403)
        expect(res.body.message).toBe("Access forbidden")
    })

    test("returns candidate profile for job seeker", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .get("/api/v1/profiles/candidates/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(
            expect.objectContaining({
                full_name: null,
                location: null,
                summary: null,
            }),
        )
    })

    test("returns 404 if candidate profile row does not exist", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })
        const loginRes = await loginUser({ email })

        await pool.query("DELETE FROM candidate_profiles WHERE user_id = (SELECT id FROM users WHERE email = $1)", [email])

        const res = await request(app)
            .get("/api/v1/profiles/candidates/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body.message).toBe("Profile not found")
    })
})

describe("PUT /profiles/candidates", () => {
    test("updates candidate profile for authenticated job seeker", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })
        const loginRes = await loginUser({ email })

        const payload = {
            full_name: "John Doe",
            location: "Bangkok",
            summary: "Backend engineer",
        }

        const res = await request(app)
            .put("/api/v1/profiles/candidates/")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(
            expect.objectContaining({
                full_name: payload.full_name,
                location: payload.location,
                summary: payload.summary,
            }),
        )
    })

    test("returns 403 for recruiter token", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .put("/api/v1/profiles/candidates/")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .send({ full_name: "Should not update" })

        expect(res.statusCode).toBe(403)
        expect(res.body.message).toBe("Access forbidden")
    })
})

describe("POST /profiles/candidates/my/avatar", () => {
    test("upload avatar sucecssfully", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })
        const loginRes = await loginUser({ email })
        const buf = Buffer.alloc(10 * 1024, "a")

        const res = await request(app)
            .post("/api/v1/profiles/candidates/my/avatar")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("avatar", buf, "avatar.png")

        const avatar_url = path.join("./", res.body.avatarUrl)
        
        fs.readFile(avatar_url, (err, data) => {
            if (err) return console.error(err)
            
            expect(data.length).toBe(buf.length)
            const isEqual = data.equals(buf)
            expect(isEqual).toBe(true)
        })
    
        expect(res.statusCode).toBe(201)
    })
})

describe("DELETE /profiles/candidates/my/avatar", () => {
    test("delete avatar sucecssfully", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .delete("/api/v1/profiles/candidates/my/avatar")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.body).toStrictEqual({ message: "Avatar removed!" })
    })
})

describe("GET /profiles/candidates/:id", () => {
    test("returns 404 for invalid UUID format", async () => {
        const res = await request(app).get("/api/v1/profiles/candidates/not-a-uuid").set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(404)
        expect(res.body.error).toBe("Profile not found")
    })

    test("returns 404 when profile UUID is valid but not found", async () => {
        const res = await request(app).get("/api/v1/profiles/candidates/11111111-1111-4111-8111-111111111111").set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(404)
        expect(res.body.error).toBe("Profile not found")
    })

    test("returns public candidate profile by id", async () => {
        const email = generateTestingEmail()
        await registerUser({ email })

        const profileQuery = await pool.query(
            "SELECT id, full_name, location, summary FROM candidate_profiles WHERE user_id = (SELECT id FROM users WHERE email = $1)",
            [email],
        )
        const profile = profileQuery.rows[0]

        await pool.query("UPDATE candidate_profiles SET full_name = $1, location = $2, summary = $3 WHERE id = $4", [
            "John Public",
            "Hanoi",
            "Open to work",
            profile.id,
        ])

        const res = await request(app).get(`/api/v1/profiles/candidates/${profile.id}`).set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(
            expect.objectContaining({
                id: profile.id,
                full_name: "John Public",
                location: "Hanoi",
                summary: "Open to work",
            }),
        )
    })
})

describe("GET /profiles/companies/:id", () => {
    test("returns 404 when company not found", async () => {
        const res = await request(app).get("/api/v1/profiles/companies/11111111-1111-4111-8111-111111111111").set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(404)
        expect(res.body.message).toBe("Company not found")
    })

    test("returns public company profile and expands logo URL", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })

        const companyQuery = await pool.query("SELECT id FROM companies WHERE user_id = (SELECT id FROM users WHERE email = $1)", [email])
        const companyId = companyQuery.rows[0].id

        await pool.query("UPDATE companies SET name = $1, description = $2, website = $3, location = $4, logo_url = $5 WHERE id = $6", [
            "ACME",
            "Hiring",
            "https://acme.test",
            "Bangkok",
            "/uploads/logos/acme.png",
            companyId,
        ])

        const res = await request(app).get(`/api/v1/profiles/companies/${companyId}`).set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(
            expect.objectContaining({
                id: companyId,
                name: "ACME",
                description: "Hiring",
                website: "https://acme.test",
                location: "Bangkok",
                logo_url: expect.stringMatching("/uploads/logos/acme.png"),
            }),
        )
    })
})

describe("GET /profiles/companies/my", () => {
    test("returns recruiter company profile", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        await pool.query("UPDATE companies SET name = $1, location = $2 WHERE user_id = (SELECT id FROM users WHERE email = $3)", [
            "ACME",
            "Bangkok",
            email,
        ])

        const res = await request(app)
            .get("/api/v1/profiles/companies/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(
            expect.objectContaining({
                name: "ACME",
                location: "Bangkok",
            }),
        )
    })

    test("returns 403 for job seeker token", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "job_seeker" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .get("/api/v1/profiles/companies/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(403)
        expect(res.body.message).toBe("Access forbidden")
    })
})

describe("PUT /profiles/companies/logo", () => {
    test("upload a logo correctly", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .put("/api/v1/profiles/companies/logo")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("logo", fakePng, "logo.png")

        // check if logo url is stored in DB
        const result = await pool.query("SELECT logo_url from companies WHERE user_id = (SELECT id FROM users WHERE email = $1)", 
            [email])
        const urlFromDB = result.rows[0].logo_url

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty("logoUrl")
        expect(urlFromDB).toBe(res.body.logoUrl)
        expect(fs.existsSync(`./${res.body.logoUrl}`)).toBe(true)
    })

    test("fail when no file is uploaded", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .put("/api/v1/profiles/companies/logo")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .set("User-Agent", "Jest Test Runner")

        expect(res.statusCode).toBe(400)
        expect(res.body).toEqual({ error: "No file uploaded" })
    })

    test("fail when file type is invalid", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const fakeTxt = Buffer.from("hello world")
        const res = await request(app)
            .put("/api/v1/profiles/companies/logo")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .set("User-Agent", "Jest Test Runner")
            .attach("logo", fakeTxt, "file.txt")
    
        expect(res.statusCode).toBe(400)
        expect(res.body).toMatchObject({ error: "Only PNG/JPEG/JPG/WEBP allowed" })
    })

    test("send a oversized logo", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const fakeLargeFile = Buffer.alloc(6 * 1024 * 1024, "a") 
        
        const res = await request(app)
            .put("/api/v1/profiles/companies/logo")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .set("User-Agent", "Jest Test Runner")
            .attach("logo", fakeLargeFile, "fakeLargeFile.png")

        expect(res.statusCode).toBe(400)
        expect(res.body).toMatchObject({ error: "Maximum file size is 2MB" })
    })
})

describe("POST /profiles/companies/verify", () => {
    test("upload a verification document correctly", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, 'a'), "document.docx")

        const result = await pool.query(
            "select * from company_verification_documents where file_path=$1",
            [res.body[0].file_path]
        )

        expect(res.statusCode).toBe(201)
        expect(res.body[0].document_type).toBe("docx")
        expect(result?.rows[0]).toBeDefined()
        expect(fs.existsSync(`./${res.body[0].file_path}`)).toBe(true)
    })

    test("upload 5 verification documents correctly", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "document1.pdf")
            .attach("documents", Buffer.alloc(1024, "a"), "document2.docx")
            .attach("documents", Buffer.alloc(1024, "a"), "image2.png")
            .attach("documents", Buffer.alloc(1024, "a"), "image3.jpeg")
            .attach("documents", Buffer.alloc(1024, "a"), "image4.jpg")

        const allowedTypes = ["pdf", "jpeg", "jpg", "png", "docx", "doc"]
        expect(res.statusCode).toBe(201)
        for (const doc of res.body) {
            const result = await pool.query(
                "SELECT * FROM company_verification_documents WHERE file_path = $1",
                [doc.file_path]
            );

            expect(result?.rows[0]).toBeDefined();
            expect(allowedTypes).toContain(doc.document_type);
            expect(fs.existsSync(`./${doc.file_path}`)).toBe(true);
        }
    })

    test("upload oversized verification documents", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(20 * 1024 * 1024, "a"), "document.docx")

        expect(res.statusCode).toBe(400)
        expect(res.body).toMatchObject({ error: "Maximum file size is 10MB" })
    })

    test("upload wrong verification document file type", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const res = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(15 * 1024 * 1024, "a"), "document.pdfe")

        expect(res.statusCode).toBe(400)
        expect(res.body).toMatchObject({ error: "Only PDF/DOCX/DOC/JPG/JPEG/PNG allowed" })
    })
})

describe("GET /profiles/companies/verify", () => {
    test("get company verification documents", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const uploadRes = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "document.pdf")

        const res = await request(app).get("/api/v1/profiles/companies/verify").set("Authorization", `Bearer ${loginRes.body.access_token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
        expect(res.body[0].file_path).toBe(uploadRes.body[0].file_path)
    })
})

describe("DELETE /profiles/companies/verify", () => {
    test("delete verification documents", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const uploadRes = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "document.pdf")

        const fileId = uploadRes.body[0].id

        const res = await request(app)
            .delete("/api/v1/profiles/companies/verify")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .send({ docs: [fileId] })

        const dbCheck = await pool.query("SELECT * FROM company_verification_documents WHERE id=$1", [fileId])

        expect(res.statusCode).toBe(200)
        expect(dbCheck.rows.length).toBe(0)
        expect(res.body).toStrictEqual({ message: "Total files deleted are 1" })
    })
})

describe("PUT /profiles/companies/verify/:fileId", () => {
    test("edit verification document's name", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const uploadRes = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "document.pdf")

        const fileId = uploadRes.body[0].id
        const oldPath = uploadRes.body[0].file_path
        const res = await request(app)
            .put(`/api/v1/profiles/companies/verify/${fileId}`)
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .send({
                file_name: 'updated_name.pdf'
            })
            
        const dbCheck = await pool.query("SELECT * FROM company_verification_documents WHERE id=$1", [fileId])

        expect(res.statusCode).toBe(200)
        expect(dbCheck.rows[0].file_name).toBe("updated_name.pdf")
        expect(dbCheck.rows[0].file_path).toBe(oldPath)
    }),

    test("edit verification document's file", async () => {
        const email = generateTestingEmail()
        await registerUser({ email, role: "recruiter" })
        const loginRes = await loginUser({ email })

        const uploadRes = await request(app)
            .post("/api/v1/profiles/companies/verify")
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "document.pdf")

        const fileId = uploadRes.body[0].id
        const res = await request(app)
            .put(`/api/v1/profiles/companies/verify/${fileId}`)
            .set("Authorization", `Bearer ${loginRes.body.access_token}`)
            .attach("documents", Buffer.alloc(1024, "a"), "new_document.pdf")
        
        const dbCheck = await pool.query("SELECT * FROM company_verification_documents WHERE id=$1", [fileId])

        expect(res.statusCode).toBe(200)
        expect(dbCheck.rows[0].file_name).toBe("new_document.pdf")
        expect(dbCheck.rows[0].file_path).toBe(res.body.file_path)
    })
})