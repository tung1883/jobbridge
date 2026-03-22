const Joi = require("joi")

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })
    if (error) {
        const messages = error.details.map((d) => d.message)
        return res.status(400).json({ success: false, errors: messages })
    }
    next()
}

const passwordValidator = Joi.string()
    .min(8)
    .max(72) // matching bcrypt's max password length
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[0-9]/, "number")
    .pattern(/[!@#$%^&*()_+\-=]/, "special character")
    .required()
    .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.name": "Password must contain at least one {#name}",
        "any.required": "Password is required",
    })

const humanText = Joi.extend((joi) => ({
    type: "humanText",
    base: joi.string(),
    messages: {
        "humanText.empty": "Text cannot be empty",
        "humanText.notHuman": "Text must look like human language",
    },
    rules: {
        isHuman: {
            validate(value, helpers) {
                const sanitized = value.trim().replace(/\s+/g, " ")
                
                if (sanitized.length === 0) {
                    return helpers.error("humanText.empty")
                }

                // Must contain letters
                if (!/[a-zA-Z]/.test(sanitized)) {
                    return helpers.error("humanText.notHuman")
                }

                // Must contain vowels (English-like heuristic)
                if (!/[aeiouAEIOU]/.test(sanitized)) {
                    return helpers.error("humanText.notHuman")
                }

                // Reject if all symbols / numbers
                if (/^[\d\W]+$/.test(sanitized)) {
                    return helpers.error("humanText.notHuman")
                }

                // Reject long repeated characters ("aaaaaaa", "!!!!!!!")
                if (/^(.)\1{4,}$/.test(sanitized)) {
                    return helpers.error("humanText.notHuman")
                }

        
                // console.log('sanitized')
                return sanitized // safe output
            },
        },
    },
}))

const schemas = {
    register: Joi.object({
        // name:     Joi.string().min(2).max(50).required(), // update name in the future
        email: Joi.string().email().required(),
        password: passwordValidator,
        role: Joi.string().valid("job_seeker", "recruiter").default("job_seeker"),
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: passwordValidator,
    }),

    job: Joi.object({
        title: humanText.humanText().isHuman().max(200).required(),
        description: humanText.humanText().isHuman().max(5000).required(),
        responsibilities: humanText.humanText().isHuman().max(500).allow("", null),
        required_qualifications: humanText.humanText().isHuman().max(500).allow("", null),
        salary_min: Joi.number().integer().min(0).allow(null),
        salary_max: Joi.when("salary_min", {
            is: Joi.number().min(0),
            then: Joi.number().integer().min(Joi.ref("salary_min")).allow(null, ""),
            otherwise: Joi.number().integer().min(0).allow(null, ""),
        }),
        currency: Joi.string().uppercase().valid("USD", "EUR", "GBP", "JPY", "VND"),
        location: Joi.string().trim().max(20).allow("", null),
        job_type: Joi.string().valid("Full-time", "Part-time", "Contract", "Internship", "Temporary"),
        publishing_date: Joi.date().iso(),
        application_deadline: Joi.date().iso(),
    }),
}

module.exports = { validate, schemas }
