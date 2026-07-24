async function run() {
  try {
    const loginRes = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Salvatore', password: 'Salvatore' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.error('Login failed:', loginData);
      return;
    }
    
    console.log('Login success');
    const token = loginData.token;
    
    const searchRes = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/admin/typesense/search?q=E53', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    console.log('Search Status:', searchRes.status);
    console.log('Search Hits:', searchData.hits?.length);
    if (searchRes.status !== 200) {
      console.log('Error data:', searchData);
    }
  } catch(e) {
    console.error('Network Error:', e);
  }
}
run();
