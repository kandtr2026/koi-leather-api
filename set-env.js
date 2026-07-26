const { execSync } = require('child_process');
const url = 'postgresql://postgres:ABC123abc%40%40%24%24%24%24%40%40@db.stdkeltylgakfvqejugz.supabase.co:6543/postgres?sslmode=require';
execSync(`npx vercel env add DATABASE_URL production,preview --value "${url}" --yes`, { stdio: 'inherit' });
execSync(`npx vercel env add DATABASE_URL development --value "${url}" --no-sensitive --yes`, { stdio: 'inherit' });
console.log('DONE');
