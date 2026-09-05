require('dotenv').config({ path: './server/.env' });
const u = process.env.GOOGLE_SHEET_WEBHOOK_URL || '';
console.log('Length:', u.length);
console.log('First char code:', u.charCodeAt(0), 'First char:', u[0]);
console.log('Last char code:', u.charCodeAt(u.length - 1), 'Last char:', u[u.length - 1]);
console.log('Starts with http:', u.startsWith('http'));
console.log('Full URL:', u);
