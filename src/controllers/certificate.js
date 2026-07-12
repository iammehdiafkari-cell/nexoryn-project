const crypto = require('crypto');
const path = require('path');
const db = require('../models/database');
const { hashContent, signCertificate, verifyCertificate } = require('../utils/cryptoUtils');
const { generateCertificatePDF } = require('../utils/pdfGenerator');

const issueCertificate = async (req, res) => {
    const { studentName, studentId, major, degree, organizationName, issueDate } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (!studentName || !studentId || !major || !degree || !organizationName || !issueDate) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const certId = crypto.randomUUID();
        
        const certData = {
            id: certId,
            student_id: studentId,
            student_name: studentName,
            major: major,
            degree: degree,
            organization: organizationName,
            issue_date: issueDate
        };

        const contentHash = hashContent(certData);
        
        const tokenPayload = {
            certId,
            hash: contentHash,
            studentId
        };
        const signedToken = signCertificate(tokenPayload);

        db.run(
            `INSERT INTO certificates (id, student_id, student_name, major, degree, organization, issue_date, content_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [certId, studentId, studentName, major, degree, organizationName, issueDate, contentHash],
            async function (err) {
                if (err) throw err;

                const pdfPath = path.join(__dirname, '../../../public/assets/certificates', `cert_${certId}.pdf`);
                await generateCertificatePDF(certData, signedToken, pdfPath);

                db.run(
                    `INSERT INTO audit_logs (action_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
                    ['ISSUE_CERT', certId, ipAddress, userAgent]
                );

                return res.status(201).json({ id: certId, token: signedToken, downloadUrl: `/assets/certificates/cert_${certId}.pdf` });
            }
        );
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error during issuance.' });
    }
};

const verifyCertificateStatus = (req, res) => {
    const { token } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (!token) return res.status(400).json({ error: 'Token is required.' });

    const decoded = verifyCertificate(token);
    
    if (!decoded) {
        logAudit('VERIFY_FAIL_INVALID_SIG', 'UNKNOWN', ipAddress, userAgent);
        return res.status(401).json({ valid: false, reason: 'Invalid digital signature.' });
    }

    db.get(`SELECT * FROM certificates WHERE id = ?`, [decoded.certId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!row) {
            logAudit('VERIFY_FAIL_NOT_FOUND', decoded.certId, ipAddress, userAgent);
            return res.status(404).json({ valid: false, reason: 'Certificate not found in registry.' });
        }
        if (row.status !== 'VALID') {
            logAudit('VERIFY_FAIL_REVOKED', decoded.certId, ipAddress, userAgent);
            return res.status(403).json({ valid: false, reason: 'Certificate has been revoked.' });
        }

        const currentData = {
            id: row.id,
            student_id: row.student_id,
            student_name: row.student_name,
            major: row.major,
            degree: row.degree,
            organization: row.organization,
            issue_date: row.issue_date
        };

        const currentHash = hashContent(currentData);

        if (currentHash !== decoded.hash) {
            logAudit('VERIFY_FAIL_TAMPERED', decoded.certId, ipAddress, userAgent);
            return res.status(403).json({ valid: false, reason: 'Content integrity check failed (Tampered).' });
        }

        logAudit('VERIFY_SUCCESS', decoded.certId, ipAddress, userAgent);

        return res.status(200).json({
            valid: true,
            data: {
                studentName: row.student_name,
                studentId: row.student_id,
                major: row.major,
                degree: row.degree,
                issueDate: row.issue_date,
                organization: row.organization
            }
        });
    });
};

function logAudit(actionType, targetId, ip, agent) {
    db.run(
        `INSERT INTO audit_logs (action_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
        [actionType, targetId, ip, agent]
    );
}

const getDashboardStats = (req, res) => {
    const stats = {};
    db.get('SELECT COUNT(*) as total FROM certificates', (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        stats.totalCerts = row ? row.total : 0;
        
        db.get('SELECT COUNT(*) as total FROM audit_logs WHERE action_type LIKE "VERIFY_%"', (err, row) => {
            stats.totalVerifications = row ? row.total : 0;
            
            db.all(`SELECT student_name, organization, issue_date FROM certificates ORDER BY created_at DESC LIMIT 5`, (err, certRows) => {
                stats.recentCerts = certRows || [];
                
                db.all(`SELECT action_type, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5`, (err, logRows) => {
                    stats.recentLogs = logRows || [];
                    res.status(200).json(stats);
                });
            });
        });
    });
};

module.exports = {
    issueCertificate,
    verifyCertificateStatus,
    getDashboardStats
};