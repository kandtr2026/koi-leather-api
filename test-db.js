const { Pool } = require('pg');
const dns = require('dns');

const host = 'db.stdkeltylgakfvqejugz.supabase.co';
const url = 'postgresql://postgres:ABC123abc%40%40%24%24%24%24%40%40@db.stdkeltylgakfvqejugz.supabase.co:5432/postgres?sslmode=require';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

console.log('Resolving hostname...');
dns.resolve4(host, (err, addresses) => {
  if (err) {
    console.error('DNS ERROR:', err);
    return;
  }
  console.log('Resolved to:', addresses);

  console.log('\nTesting connection...');
  const pool = new Pool({ connectionString: url });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('ERROR:', err.code, err.message);
      console.error('Detail:', err);
    } else {
      console.log('SUCCESS:', res.rows[0]);
    }
    pool.end();
  });
});
