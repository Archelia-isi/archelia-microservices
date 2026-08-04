const fs = require('fs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const envConfig = dotenv.parse(fs.readFileSync('./.env'));

const token = jwt.sign({
  userId: 'cmmyu0idy000q28qepijdosl8',
  username: 'salvatore',
  role: 'MASTER'
}, envConfig.JWT_SECRET || 'super-secret-archelia-key', { expiresIn: '1h' });

console.log('Token generated');

async function main() {
  const res = await fetch('http://localhost:3000/api/auth/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username: 'test_admin_2',
      password: 'password123',
      role: 'ADMIN'
    })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
}

main().catch(console.error);
