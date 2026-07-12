const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const QRCode = require('qrcode');
const db = require('../models/database');
const path = require('path');
const puppeteer = require('puppeteer');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/assets';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'signature.png');
    }
});

const upload = multer({ storage });

function enforcePersianNumbers(str) {
    if (!str) return '';
    return str.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

router.post('/upload-signature', upload.single('signature'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    res.json({ message: "Signature updated successfully." });
});

router.get('/student/:id', (req, res) => {
    const studentId = req.params.id;
    const englishId = studentId.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    db.get('SELECT * FROM students WHERE student_id = ?', [englishId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ found: false });
        res.json({ found: true, data: row });
    });
});

router.post('/issue', async (req, res) => {
    const { studentName, studentId, major, degree, organizationName, issueDate } = req.body;
    
    const hash = crypto.createHash('sha256').update(studentName + studentId + major + degree + organizationName + issueDate + (process.env.JWT_SECRET || 'nexoryn_secret')).digest('hex');

    db.run(`INSERT OR IGNORE INTO students (student_id, student_name, major, degree) VALUES (?, ?, ?, ?)`, 
    [studentId, studentName, major, degree], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run(`INSERT INTO certificates (student_id, organization_name, issue_date, hash_code) VALUES (?, ?, ?, ?)`, 
        [studentId, organizationName, issueDate, hash], async function(err) {
            if (err) return res.status(500).json({ error: err.message });

            const lastCertId = this.lastID;
            const dir = './public/assets/certificates';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const pdfPath = `${dir}/cert_${lastCertId}.pdf`;
            const logoPath = path.join(__dirname, '../../public/assets/images.png');
            let logoBase64 = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : '';

            const sigPath = path.join(__dirname, '../../public/assets/signature.png');
            let sigBase64 = fs.existsSync(sigPath) ? `data:image/png;base64,${fs.readFileSync(sigPath).toString('base64')}` : '';

            const qrCodeDataUrl = await QRCode.toDataURL(hash, { color: { dark: '#002d62', light: '#ffffff' }, margin: 1 });

            const certNumber = enforcePersianNumbers(`۱۵۵۵۶ / ${lastCertId}`);
            const farsiStudentId = enforcePersianNumbers(studentId);
            const farsiDate = enforcePersianNumbers(issueDate);

            const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: 'Tahoma', sans-serif; background: #fff; margin: 0; padding: 0; direction: rtl; text-align: right; }
                    .container { width: 210mm; height: 297mm; padding: 25mm; box-sizing: border-box; position: relative; }
                    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; opacity: 0.04; z-index: 1; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #002d62; padding-bottom: 15px; margin-bottom: 30px; position:relative; z-index:10;}
                    .header-right { display: flex; align-items: center; gap: 15px; }
                    .header-right img { width: 75px; }
                    .header-titles { text-align: center; }
                    .header-titles h1 { font-size: 18px; margin: 0; color: #000; font-weight: bold; }
                    .header-titles h2 { font-size: 14px; margin: 5px 0 0 0; color: #444; font-weight: normal; }
                    .header-center { font-size: 18px; font-weight: bold; margin-top: 25px; }
                    .header-left { font-size: 13px; line-height: 2; text-align: right; }
                    .cert-title { text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0 40px 0; color: #002d62; position:relative; z-index:10;}
                    .cert-body { font-size: 16px; line-height: 2.4; text-align: justify; text-justify: inter-word; position:relative; z-index:10;}
                    .footer-section { position: absolute; bottom: 25mm; left: 25mm; right: 25mm; z-index:10;}
                    .signatures-area { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
                    .qr-box { text-align: center; }
                    .qr-box img { width: 100px; border: 1px solid #eee; padding: 5px; border-radius: 8px;}
                    .qr-box p { font-size: 10px; margin-top: 8px; color: #555; line-height: 1.6;}
                    .sign-box { text-align: center; font-size: 15px; font-weight: bold; color: #002d62; line-height: 1.8; position: relative; }
                    .sign-image { width: 160px; height: auto; mix-blend-mode: multiply; margin-bottom: -20px; display: block; margin-left: auto; margin-right: auto;}
                    .address-footer { border-top: 1px solid #ccc; padding-top: 15px; font-size: 11px; text-align: center; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${logoBase64 ? `<img src="${logoBase64}" class="watermark">` : ''}
                    <div class="header">
                        <div class="header-right">
                            ${logoBase64 ? `<img src="${logoBase64}">` : ''}
                            <div class="header-titles">
                                <h1>دانشگاه آزاد اسلامی</h1>
                                <h2>واحد یادگار امام خمینی (ره)</h2>
                            </div>
                        </div>
                        <div class="header-center">بسمه تعالی</div>
                        <div class="header-left">
                            <div>شماره: ${certNumber}</div>
                            <div>تاریخ: ${farsiDate}</div>
                            <div>پیوست: ندارد</div>
                        </div>
                    </div>
                    <div class="cert-title">گواهی اشتغال به تحصیل</div>
                    <div class="cert-body">
                        گواهی می‌شود آقای / خانم <strong>${studentName}</strong> دارای شماره دانشجویی <strong>${farsiStudentId}</strong>، دانشجوی مقطع <strong>${degree}</strong> رشته تحصیلی <strong>${major}</strong>، در این واحد دانشگاهی مشغول به تحصیل می‌باشند.
                        <br><br>
                        این گواهی بنا به درخواست نامبرده جهت ارائه به <strong>«${organizationName}»</strong> صادر گردیده است و فاقد هرگونه ارزش قانونی دیگر یا تعهد مالی برای دانشگاه می‌باشد.
                    </div>
                    <div class="footer-section">
                        <div class="signatures-area">
                            <div class="qr-box">
                                <img src="${qrCodeDataUrl}">
                                <p>اصالت این مدرک از طریق اسکن رمزینه<br>یا بخش استعلام سامانه قابل بررسی است.</p>
                            </div>
                            <div class="sign-box">
                                ${sigBase64 ? `<img src="${sigBase64}" class="sign-image">` : '<br><br><br>'}
                                معاونت آموزشی و تحصیلات تکمیلی<br>
                                دانشگاه آزاد اسلامی واحد یادگار امام (ره)
                            </div>
                        </div>
                        <div class="address-footer">
                            نشانی: تهران، کیلومتر ۶ بزرگراه خلیج فارس (تهران-قم)، دانشگاه آزاد اسلامی واحد یادگار امام خمینی (ره) - تلفن: ۵۵۲۲۹۲۰۰
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `;

            try {
                const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
                const browser = await puppeteer.launch({ headless: 'new', executablePath: chromePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
                await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
                await browser.close();
                res.json({ id: lastCertId, hash: hash });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    });
});

router.get('/verify/:hash', async (req, res) => {
    const { hash } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    db.get(`SELECT c.issue_date, c.organization_name, s.student_name, s.student_id, s.major, s.degree FROM certificates c JOIN students s ON c.student_id = s.student_id WHERE c.hash_code = ?`, [hash], (err, row) => {
        if (err) { db.run(`INSERT INTO audit_logs (hash_code, ip_address, status) VALUES (?, ?, ?)`, [hash, ip, 'ERROR']); return res.status(500).json({ error: err.message }); }
        if (!row) { db.run(`INSERT INTO audit_logs (hash_code, ip_address, status) VALUES (?, ?, ?)`, [hash, ip, 'INVALID']); return res.json({ valid: false }); }
        db.run(`INSERT INTO audit_logs (hash_code, ip_address, status) VALUES (?, ?, ?)`, [hash, ip, 'VALID']);
        res.json({ valid: true, data: { studentName: row.student_name, studentId: row.student_id, major: row.major, degree: row.degree, issueDate: row.issue_date, organizationName: row.organization_name } });
    });
});

router.get('/stats', (req, res) => {
    const stats = {};
    db.get('SELECT COUNT(*) as total FROM certificates', (err, row) => {
        stats.totalCerts = row ? row.total : 0;
        db.get('SELECT COUNT(*) as total FROM audit_logs', (err, row) => {
            stats.totalVerifications = row ? row.total : 0;
            db.all(`SELECT c.issue_date, s.student_name, c.organization_name FROM certificates c JOIN students s ON c.student_id = s.student_id ORDER BY c.created_at DESC LIMIT 5`, (err, certRows) => {
                stats.recentCerts = certRows || [];
                db.all(`SELECT ip_address, status, checked_at FROM audit_logs ORDER BY checked_at DESC LIMIT 5`, (err, logRows) => {
                    stats.recentLogs = logRows || [];
                    res.json(stats);
                });
            });
        });
    });
});

module.exports = router;