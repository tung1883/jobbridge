const { sanitizeString, sanitizeRequestBody, scrub } = require('../../src/utils/sanitize');

describe('sanitizeString()', () => {
    test('trims whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
    });

    test('strips HTML tags', () => {
        expect(sanitizeString('<script>hack()</script>John')).toBe('hack()John');
    });

    test('strips dangerous characters', () => {
        expect(sanitizeString('<b>hi</b>')).toBe('hi');
        expect(sanitizeString("it's a `test`")).toBe('its a test');
    });

    test('leaves normal strings untouched', () => {
        expect(sanitizeString('john@test.com')).toBe('john@test.com');
        expect(sanitizeString('Hello World')).toBe('Hello World');
    });

    test('returns non-strings as-is', () => {
        expect(sanitizeString(25)).toBe(25);
        expect(sanitizeString(true)).toBe(true);
        expect(sanitizeString(null)).toBe(null);
    });
});

describe('sanitizeRequestBody()', () => {
    test('sanitizes all string values', () => {
        const body = {
        name:  '<script>hack()</script>John',
        email: 'john@test.com',
        };
        expect(sanitizeRequestBody(body)).toEqual({
        name:  'hack()John',
        email: 'john@test.com',
        });
    });

    test('leaves non-string values untouched', () => {
        const body = { age: 25, active: true };
        expect(sanitizeRequestBody(body)).toEqual({ age: 25, active: true });
    });

    test('sanitizes nested objects', () => {
        const body = {
        user: { bio: '<b>hello</b>' },
        };
        expect(sanitizeRequestBody(body)).toEqual({
        user: { bio: 'hello' },
        });
    });

    test('sanitizes strings inside arrays', () => {
        const body = { tags: ['<b>admin</b>', 'user'] };
        expect(sanitizeRequestBody(body)).toEqual({ tags: ['admin', 'user'] });
    });

    test('returns body as-is if not an object', () => {
        expect(sanitizeRequestBody(null)).toBe(null);
        expect(sanitizeRequestBody(undefined)).toBe(undefined);
        expect(sanitizeRequestBody('string')).toBe('string');
    });
    });

    describe('scrub()', () => {
    test('scrubs password field', () => {
        const body = { email: 'john@test.com', password: 'secret123' };
        expect(scrub(body).password).toBe('***');
        expect(scrub(body).email).toBe('john@test.com');
    });

    test('scrubs any key ending with token', () => {
        const body = { access_token: 'abc', refresh_token: 'xyz', token: '123' };
        const result = scrub(body);
        expect(result.access_token).toBe('***');
        expect(result.refresh_token).toBe('***');
        expect(result.token).toBe('***');
    });

    test('scrubs keys ending with secret', () => {
        const body = { jwtSecret: 'supersecret' };
        expect(scrub(body).jwtSecret).toBe('***');
    });

    test('does not mutate original body', () => {
        const body = { password: 'secret123' };
        scrub(body);
        expect(body.password).toBe('secret123'); // original untouched
    });

    test('returns null if body is null', () => {
        expect(scrub(null)).toBe(null);
    });
});