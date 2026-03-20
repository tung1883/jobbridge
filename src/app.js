const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const helmet         = require('helmet');
const httpLogger     = require('./utils/log/httpLogger');
const { defaultLimiter } = require('./middleware/rateLimiter');
const { sanitizeRequestsBody }   = require('./utils/sanitize');
const errorHandler   = require('./middleware/errorHandler');

const authRoutes     = require('./routes/auth');
const jobRoutes      = require('./routes/jobs');
const appRoutes      = require('./routes/applications');
const profileRoutes  = require('./routes/profiles');
const cvRoutes       = require('./routes/cv');
const rankingRouter  = require('./routes/ranking');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.static(path.join(__dirname, '../uploads')));
app.use(express.json());
app.use((req, res, next) => {
  req.body = sanitizeRequestsBody(req.body);
  next();
});
app.use(httpLogger);
app.use(defaultLimiter);

app.use('/auth',         authRoutes);
app.use('/ranking',      rankingRouter);
app.use('/jobs',         jobRoutes);
app.use('/applications', appRoutes);
app.use('/profiles',     profileRoutes);
app.use('/cvs',          cvRoutes);

app.use(errorHandler);

module.exports = app;