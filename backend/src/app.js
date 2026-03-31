const express                 = require('express');
const cors                    = require('cors');
const path                    = require('path');
const helmet                  = require('helmet');
const http                    = require('http')

const httpLogger              = require('./utils/log/httpLogger');
const { defaultLimiter }      = require('./middleware/rateLimiter');
const { sanitizeRequestBody } = require('./utils/sanitize');
const errorHandler            = require('./middleware/errorHandler');

const authRoutes              = require('./routes/auth');
const jobRoutes               = require('./routes/jobs');
const appRoutes               = require('./routes/applications');
const profileRoutes           = require('./routes/profiles');
const cvRoutes                = require('./routes/cv');
const rankingRouter           = require('./routes/ranking');
const bookmarkRoutes          = require('./routes/bookmark')
const downloadRoutes          = require('./routes/download')
const { router: sseRouter }   = require('./routes/sse')

const app = express();

app.use(cors());
app.use(helmet());
// app.use(
//     cors({
//         origin: process.env.CLIENT_URL || "http://localhost:5173",
//         credentials: true,
//     }),
// )
app.use(
    "/uploads",
    (req, res, next) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
        next()
    },
    express.static(path.join(__dirname, "uploads")),
)
app.use(express.json());
app.use((req, res, next) => {
  req.body = sanitizeRequestBody(req.body);
  next();
});
app.use(httpLogger);
// app.use(defaultLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")))
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/ranking',      rankingRouter);
app.use('/api/v1/jobs',         jobRoutes);
app.use('/api/v1/applications', appRoutes);
app.use('/api/v1/profiles',     profileRoutes);
app.use('/api/v1/cvs',          cvRoutes);
app.use('/api/v1/bookmark/',    bookmarkRoutes)
app.use('/api/v1/download/',    downloadRoutes)
app.use('/sse/',                sseRouter);

app.use(errorHandler);

module.exports = app;