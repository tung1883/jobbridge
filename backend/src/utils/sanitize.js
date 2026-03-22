const sanitizeString = (str) => {
    if (typeof str !== 'string') {
        return str;
    }

    return str
        .trim()
        .replace(/<[^>]*>/g, '')       // strip HTML tags
        .replace(/[<>'"`;]/g, '');     // strip dangerous chars
};

const sanitizeRequestBody = (body) => {
    if (!body || typeof body !== 'object') return body;

    const clean = {};

    // recursively sanitize all string values in the body
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
            clean[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
            clean[key] = value.map((item) => {
                return (typeof item === 'string') ? sanitizeString(item) : sanitizeRequestBody(item)
            });
        } else if (typeof value === 'object' && value !== null) {
            clean[key] = sanitizeRequestBody(value); // recurse into nested objects
        } else {
            clean[key] = value; // number, boolean — leave as-is
        }
    }

    return clean;
};

// to scrub sensitive fields like password, token, secret into '***' for logging
const scrub = (body) => {
    if (!body) {
        return null;
    }

    const safe = { ...body };

    Object.keys(safe).forEach((key) => {
        if (key.toLowerCase().includes('token')    ||
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret')) {
            safe[key] = '***';
        }
    });

    return safe;
};

module.exports = { sanitizeString, sanitizeRequestBody, scrub };   