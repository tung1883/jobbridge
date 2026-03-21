const logger = require('../utils/log/logger');
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    logger.info('User registered', { userId: user.id, email: user.email });
    res.status(201).json({ email: user.email, role: user.role });
  } catch (err) { 
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    err.context = { email: req.body.email };
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await loginUser(req.body);
    logger.info('User logged in', { email: req.body.email });
    res.json(data);
  } catch (err) {
    if (err.status) {
      if (err.status === 401) {
        logger.warn('Failed login attempt', { email: req.body.email });
      }

      return res.status(err.status).json({ error: err.message });
    }
    
    err.context = { email: req.body.email };
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const data = await refreshAccessToken(refresh_token);
    res.json(data);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await logoutUser({
      userId:       req.user.id,
      refreshToken: req.body.refresh_token,
    });
    logger.info('User logged out', { userId: req.user.id });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout };