const https = require('https');

const loginData = JSON.stringify({
  username: 'salvatore',
  password: 'Salvatore'
});

const loginOptions = {
  hostname: 'api-gateway-production-2ec6.up.railway.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = https.request(loginOptions, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const response = JSON.parse(body);
    if (!response.token) {
      console.log('Login failed:', response);
      return;
    }
    
    console.log('Logged in to Railway successfully!');
    
    // Now get users
    const getOptions = {
      hostname: 'api-gateway-production-2ec6.up.railway.app',
      port: 443,
      path: '/api/auth/users',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + response.token
      }
    };
    
    const getReq = https.request(getOptions, res2 => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log('Railway Users:', body2);
      });
    });
    
    getReq.end();
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(loginData);
req.end();
