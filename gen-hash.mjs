import crypto from 'crypto';

const password = 'AppleReview2026';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
const storedHash = `${salt}:${hash}`;
console.log('Password:', password);
console.log('Hash:', storedHash);

// Verify
const [s, h] = storedHash.split(':');
const verifyHash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
console.log('Verification:', h === verifyHash ? 'PASS' : 'FAIL');
