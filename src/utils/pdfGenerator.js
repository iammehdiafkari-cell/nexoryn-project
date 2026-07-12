const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

async function generateCertificatePDF(certData, qrToken, outputPath) {
    const qrCodeDataUrl = await QRCode.toDataURL(qrToken, { color: { dark: '#002D62', light: '#FFFFFF' }, margin: 1 });
    
    const logoPath = path.join(__dirname, '../../public/assets/images.png');
    const logoBase64 = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            @font-face {
                font-family: 'Vazirmatn';
                src: url('file://${path.join(__dirname, '../../fonts/Vazirmatn.ttf')}') format('truetype');
            }
            @page { size: A4; margin: 0; }
            body { font-family: 'Vazirmatn', sans-serif; background: #fff; margin: 0; padding: 0; direction: rtl; text-align: right; color: #1E293B; }
            .container { width: 210mm; height: 297mm; padding: 25mm; box-sizing: border-box; position: relative; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #002D62; padding-bottom: 15px; margin-bottom: 30px; }
            .header-right { display: flex; align-items: center; gap: 15px; }
            .header-right img { width: 80px; }
            .header-titles h1 { font-size: 18px; margin: 0; color: #002D62; font-weight: 700; }
            .header-titles h2 { font-size: 13px; margin: 5px 0 0 0; color: #64748B; font-weight: normal; }
            .header-left { font-size: 12px; line-height: 2; color: #0F172A; }
            .title { text-align: center; font-size: 20px; font-weight: bold; margin: 30px 0; color: #002D62; }
            .content { font-size: 15px; line-height: 2.2; text-align: justify; text-justify: inter-word; }
            .footer-section { position: absolute; bottom: 25mm; left: 25mm; right: 25mm; display: flex; justify-content: space-between; align-items: flex-end; }
            .qr-container { text-align: center; }
            .qr-container img { width: 110px; border: 1px solid #E2E8F0; padding: 4px; border-radius: 6px; }
            .qr-container p { font-size: 10px; color: #64748B; margin-top: 5px; }
            .sign-container { text-align: left; font-size: 14px; font-weight: bold; color: #002D62; line-height: 1.8; }
            .bottom-bar { position: absolute; bottom: 10mm; left: 25mm; right: 25mm; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 10px; text-align: center; color: #64748B; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-right">
                    ${logoBase64 ? `<img src="${logoBase64}">` : ''}
                    <div class="header-titles">
                        <h1>??????? ???? ??????</h1>
                        <h2>???? ?????? ???? ????? (??)</h2>
                    </div>
                </div>
                <div class="header-left">
                    <div>????? ??????: ${certData.id}</div>
                    <div>????? ????: ${certData.issue_date}</div>
                </div>
            </div>
            <div class="title">????? ?????? ?? ?????</div>
            <div class="content">
                ?????????? ????? ?????? ???/???? <strong>${certData.student_name}</strong> ????? ????? ???????? <strong>${certData.student_id}</strong>? ??????? ???? <strong>${certData.degree}</strong> ?? ???? ?????? <strong>${certData.major}</strong>? ?? ??? ???? ???????? ????? ?? ????? ????????.
                <br><br>
                ??? ????? ??? ?? ??????? ??????? ??? ????? ?? <strong>${certData.organization}</strong> ???? ?????? ??? ? ???? ?????? ???? ???? ?? ????? ???? ???? ??????? ???????.
            </div>
            <div class="footer-section">
                <div class="qr-container">
                    <img src="${qrCodeDataUrl}">
                    <p>??????? ????? ?? ???? ???? ?????</p>
                </div>
                <div class="sign-container">
                    ?????? ?????? ? ??????<br>
                    ??????? ???? ?????? ???? ?????? ???? (??)
                </div>
            </div>
            <div class="bottom-bar">
                © ????? ???? ??? ?????? ????? ?? ???? ????? ??????? ???????.
            </div>
        </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
    await browser.close();
}

module.exports = { generateCertificatePDF };