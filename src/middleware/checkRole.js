const VALID_ROLES = ['admin', 'job_seeker', 'recruiter'];

module.exports = (...roles) => {
    return (req, res, next) => {
        const invalidRole = roles.find(r => !VALID_ROLES.includes(r));

        if (invalidRole) {
            return next(new Error(`Invalid role: ${invalidRole}`));     
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access forbidden' });
        }

        next();
    };
};