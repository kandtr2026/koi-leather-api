const { execSync } = require('child_process');

const url = 'postgresql://postgres.stdkeltylgakfvqejugz:ABC123abc%24%24%40%40%25%25@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require';
console.log('Setting DATABASE_URL to:', url);

try { execSync(`npx vercel env rm DATABASE_URL production --yes`, { stdio: 'pipe' }); } catch(e) {}
try { execSync(`npx vercel env rm DATABASE_URL preview --yes`, { stdio: 'pipe' }); } catch(e) {}
try { execSync(`npx vercel env rm DATABASE_URL development --yes`, { stdio: 'pipe' }); } catch(e) {}

execSync(`npx vercel env add DATABASE_URL production,preview --value "${url}" --yes`, { stdio: 'inherit' });
execSync(`npx vercel env add DATABASE_URL development --value "${url}" --no-sensitive --yes`, { stdio: 'inherit' });
console.log('DONE');
