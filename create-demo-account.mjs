import bcrypt from 'bcryptjs';

const password = 'AppleReview2026';
const hash = await bcrypt.hash(password, 12);
console.log('Password hash:', hash);
console.log('Password:', password);
