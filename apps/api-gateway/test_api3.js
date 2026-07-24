async function run() {
  const loginRes = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Salvatore', password: 'Salvatore' })
  });
  const { token } = await loginRes.json();
  const schedRes = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/v1/admin/scheduler', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await schedRes.json();
  console.log(JSON.stringify(data, null, 2));
}
run().catch(console.error);
