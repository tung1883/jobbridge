const request = require("supertest")

const app = require("../../src/app")
const pool = require("../../config/db")
const { generateTestingEmail } = require("../setup")

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

const jobGenerator = (data = {}) => {
    const job = {
        title: "Full-Stack JavaScript Developer",
        description: "We are looking for a full-stack developer to build and maintain modern web applications.",
        responsibilities: "Develop and maintain backend services",
        required_qualifications: "3+ years experience with JavaScript/Node.js",
        salary_min: 45000,
        salary_max: 65000,
        currency: "USD",
        location: "Berlin, Germany",
        job_type: "Full-time",
        publishing_date: "2026-03-22",
        application_deadline: "2026-04-30",
        ...data,
    }

    return job
}

const setUpRecruiter = async () => {
    const email = generateTestingEmail()
    await registerUser({ email, role: "recruiter" })
    const loginRes = await loginUser({ email })
    const { access_token, refresh_token } = loginRes.body

    await pool.query(
        `UPDATE companies
        SET verification_status = 'verified'
        WHERE user_id = (
            SELECT id
            FROM users
            WHERE email = $1
        );`,
        [email],
    )

    return { email, access_token, refresh_token }
}

afterEach(async () => {
    await pool.query("DELETE FROM jobs")
})

describe("POST /jobs/", () => {
    ;(test("post a job correctly", async () => {
        const { access_token } = await setUpRecruiter()
        const job = jobGenerator()

        const res = await request(app)
            .post("/api/v1/jobs/")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${access_token}`)
            .send(job)

        function toLocalDateString(dateString) {
            const d = new Date(dateString)
            return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-")
        }

        const normalized = {
            ...res.body,
            application_deadline: toLocalDateString(res.body.application_deadline),
            publishing_date: toLocalDateString(res.body.publishing_date),
            responsibilities: res.body.responsibilities,
            required_qualifications: res.body.required_qualifications,
            salary_min: Number(res.body.salary_min),
            salary_max: Number(res.body.salary_max),
        }

        expect(normalized).toMatchObject(job)
        expect(res.statusCode).toBe(200)
    }),
        test("post a job without getting verified", async () => {
            const email = generateTestingEmail()
            await registerUser({ email, role: "recruiter" })
            const loginRes = await loginUser({ email })

            const job = jobGenerator()

            const res = await request(app)
                .post("/api/v1/jobs/")
                .set("User-Agent", "Jest Test Runner")
                .set("Authorization", `Bearer ${loginRes.body.access_token}`)
                .send(job)

            expect(res.statusCode).toBe(403)
            expect(res.body).toMatchObject({ message: "Company not verified" })
        }),
        test("post a job without a title", async () => {
            const { access_token } = await setUpRecruiter()
            let job = jobGenerator()
            job.title = ""

            const res = await request(app)
                .post("/api/v1/jobs/")
                .set("User-Agent", "Jest Test Runner")
                .set("Authorization", `Bearer ${access_token}`)
                .send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body).toMatchObject({ success: false, errors: ['"title" is not allowed to be empty'] })
        }),
        test("empty description", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.description = ""

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors).toContain('"description" is not allowed to be empty')
        }),
        test("title too long", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.title = "A".repeat(201)

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors).toContain('"title" length must be less than or equal to 200 characters long')
        }),
        test("description too long", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.description = "A".repeat(5001)

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors).toContain('"description" length must be less than or equal to 5000 characters long')
        }),
        test("weird characters in title", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.title = "***$$$###@@@" // your humanText.isHuman() should reject this

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors[0]).toMatch("Text must look like human language")
        }),
        test("weird characters in description", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.description = "***$$$###@@@"

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors[0]).toMatch("Text must look like human language")
        }),
        test("salary_max < salary_min", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.salary_min = 50000
            job.salary_max = 40000

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors).toContain('"salary_max" must be greater than or equal to ref:salary_min')
        }),
        test("invalid job_type", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.job_type = "Freelancer"

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors).toContain('"job_type" must be one of [Full-time, Part-time, Contract, Internship, Temporary]')
        }),
        test("invalid publishing_date", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.publishing_date = "invalid-date"

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors[0]).toContain('"publishing_date" must be in ISO 8601 date format')
        }),
        test("invalid application_deadline", async () => {
            const { access_token } = await setUpRecruiter()
            const job = jobGenerator()
            job.application_deadline = "2026-99-99"

            const res = await request(app).post("/api/v1/jobs/").set("Authorization", `Bearer ${access_token}`).send(job)

            expect(res.statusCode).toBe(400)
            expect(res.body.errors[0]).toContain('"application_deadline" must be in ISO 8601 date format')
        }))
})

describe("GET /jobs/my", () => {
    test("get list of jobs that recruiter created correctly", async () => {
        const { access_token } = await setUpRecruiter()
        const job_1 = jobGenerator()
        job_1.title = 'JOB 1'
        const job_2 = jobGenerator()
        job_2.title = 'JOB_2'

        await request(app)
            .post("/api/v1/jobs/")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${access_token}`)
            .send(job_1)

        await request(app)
            .post("/api/v1/jobs/")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${access_token}`)
            .send(job_2)

        const res = await request(app)
            .get("/api/v1/jobs/my")
            .set("User-Agent", "Jest Test Runner")
            .set("Authorization", `Bearer ${access_token}`)
            
        const titles = res.body.map((j) => j.title)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(2)
        expect(titles).toContain("JOB 1")
        expect(titles).toContain("JOB_2")
    })
})
