const jwt = require('jsonwebtoken');
const auth = require('../../src/middleware/auth');  
const { jwt: jwtConfig } = require('../../config/index');

const mockReqRes = (authHeader) => {
    const req  = { headers: { authorization: authHeader } };
    const res  = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
};

describe('auth middleware', () => {
    test('calls next() with valid token', () => {
        const token = jwt.sign({ id: 1, role: 'job_seeker' }, jwtConfig.secret, { expiresIn: '15m' });
        const { req, res, next } = mockReqRes(`Bearer ${token}`);
        auth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 401 if no token provided', () => {
        const { req, res, next } = mockReqRes(null);
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token is invalid', () => {
        const { req, res, next } = mockReqRes('Bearer invalidtoken');
        auth(req, res, next);  
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token is expired', () => {
        const token = jwt.sign({ id: 1, role: 'job_seeker' }, jwtConfig.secret, { expiresIn: '-1s' });
        const { req, res, next } = mockReqRes(`Bearer ${token}`);
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if authorization header is malformed', () => {
        const { req, res, next } = mockReqRes('InvalidHeader');
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token does not start with Bearer', () => {
        const token = jwt.sign({ id: 1, role: 'job_seeker' }, jwtConfig.secret, { expiresIn: '15m' });
        const { req, res, next } = mockReqRes(token);
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token is not a string', () => {
        const { req, res, next } = mockReqRes(12345);
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token is empty string', () => {
        const { req, res, next } = mockReqRes('Bearer ');
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 if token has extra spaces', () => {
        const token = jwt.sign({ id: 1, role: 'job_seeker' }, jwtConfig.secret, { expiresIn: '15m' });
        const { req, res, next } = mockReqRes(`Bearer   ${token}  `);
        auth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });
})