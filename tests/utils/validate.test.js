const { validate, schemas } = require('../../utils/validate');

const mockReqRes = (body) => {
    const req  = { body };
    const res  = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn(),
    };
    const next = jest.fn();
    
    return { req, res, next };
};

describe('validate() middleware', () => {
    test('calls next() if body is valid', () => {
        const { req, res, next } = mockReqRes({
            email:    'john@test.com',
            password: 'Password1!',
        });

        validate(schemas.register)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 400 if body is invalid', () => {
        const { req, res, next } = mockReqRes({
            email: 'notanemail',
        });

        validate(schemas.register)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, errors: expect.any(Array) })
        );
        expect(next).not.toHaveBeenCalled();
    });
});

describe('schemas.register', () => {
    const run = (body) => schemas.register.validate(body, { abortEarly: false });

    test('passes with valid data', () => {
        const { error } = run({
            email:    'john@test.com',
            password: 'Password1!',
        });
        expect(error).toBeUndefined();
    });

    test('fails if email is invalid', () => {
        const { error } = run({ email: 'notanemail', password: 'Password1!' });
        expect(error.details[0].message).toMatch(/valid email/i);
    });

    test('fails if password has no uppercase', () => {
        const { error } = run({ email: 'john@test.com', password: 'password1!' });
        expect(error.details[0].message).toMatch(/uppercase/i);
    });

    test('fails if password has no number', () => {
        const { error } = run({ email: 'john@test.com', password: 'Password!' });
        expect(error.details[0].message).toMatch(/number/i);
    });

    test('fails if password has no special character', () => {
        const { error } = run({ email: 'john@test.com', password: 'Password1' });
        expect(error.details[0].message).toMatch(/special/i);
    });

    test('fails if password is too short', () => {
        const { error } = run({ email: 'john@test.com', password: 'Pa1!' });
        expect(error.details[0].message).toMatch(/at least 8/i);
    });

    test('returns all errors at once with abortEarly false', () => {
        const { error } = run({ email: 'bad', password: '123' });
        expect(error.details.length).toBeGreaterThan(1);
    });
});

describe('schemas.login', () => {
    const run = (body) => schemas.login.validate(body, { abortEarly: false });

    test('passes with valid data', () => {
        const { error } = run({ email: 'john@test.com', password: 'Password1!' });
        expect(error).toBeUndefined();
    });

    test('fails if email is missing', () => {
        const { error } = run({ password: 'anypassword' });
        expect(error.details[0].message).toMatch(/email/i);
    });

    test('fails if password is missing', () => {
        const { error } = run({ email: 'john@test.com' });
        expect(error.details[0].message).toMatch(/password/i);
    });
});