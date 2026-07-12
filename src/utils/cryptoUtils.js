const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const keysDir = path.resolve(__dirname, '../../keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

function generateKeysIfNotExist() {
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        fs.writeFileSync(publicKeyPath, publicKey);
        fs.writeFileSync(privateKeyPath, privateKey);
    }
}

generateKeysIfNotExist();

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

function hashContent(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function signCertificate(payload) {
    return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1y' });
}

function verifyCertificate(token) {
    try {
        return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } catch (error) {
        return null;
    }
}

module.exports = {
    hashContent,
    signCertificate,
    verifyCertificate,
    publicKey
};