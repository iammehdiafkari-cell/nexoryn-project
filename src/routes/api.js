const express = require('express');
const router = express.Router();
const { rateLimiter } = require('../middlewares/security');
const { issueCertificate, verifyCertificateStatus, getDashboardStats } = require('../controllers/certificate');

router.post('/issue', rateLimiter, issueCertificate);

router.post('/verify', rateLimiter, verifyCertificateStatus);

router.get('/stats', rateLimiter, getDashboardStats);

module.exports = router;