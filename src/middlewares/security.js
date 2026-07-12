const jwt = require('jsonwebtoken');

const rateLimitCache = new Map();

const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const currentTime = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 30;

    if (!rateLimitCache.has(ip)) {
        rateLimitCache.set(ip, { count: 1, startTime: currentTime });
        return next();
    }

    const record = rateLimitCache.get(ip);

    if (currentTime - record.startTime > windowMs) {
        record.count = 1;
        record.startTime = currentTime;
        return next();
    }

    record.count++;

    if (record.count > maxRequests) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
};

const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexoryn_secure_fallback');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = {
    rateLimiter,
    verifyAdminToken
};