const API_URL = 'https://api-gateway-production-2ec6.up.railway.app';
async function test() {
  console.log('Logging in...');
  const resAuth = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Salvatore', password: 'Salvatore' })
  });
  if (!resAuth.ok) throw new Error('Login failed: ' + resAuth.status);
  const authData = await resAuth.json();
  const token = authData.token;
  console.log('Got token:', token.substring(0, 20) + '...');

  const configToSave = {
    wallpaper: 'from_test_script',
    desktopIcons: { dashboard: { x: 999, y: 999, isPinned: true } },
    widgets: []
  };

  console.log('Sending PUT...');
  const resPut = await fetch(`${API_URL}/api/admin/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ widgetConfig: configToSave })
  });
  if (!resPut.ok) throw new Error('PUT failed: ' + resPut.status);
  console.log('PUT success:', await resPut.json());

  console.log('Sending GET...');
  const resGet = await fetch(`${API_URL}/api/admin/preferences`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resGet.ok) throw new Error('GET failed: ' + resGet.status);
  const getData = await resGet.json();
  console.log('GET success:', JSON.stringify(getData, null, 2));
}
test().catch(console.error);
