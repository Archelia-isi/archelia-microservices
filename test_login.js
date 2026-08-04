async function main() {
  const res = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'salvatore',
      password: 'Salvatore'
    })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
  
  if (data.token) {
    const res2 = await fetch('https://api-gateway-production-2ec6.up.railway.app/api/auth/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify({
        username: 'test_admin_3',
        password: 'password123',
        role: 'MASTER'
      })
    });
    const data2 = await res2.json();
    console.log('Create Status:', res2.status);
    console.log('Create Response:', data2);
  }
}

main().catch(console.error);
