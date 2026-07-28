import axios from 'axios';

async function triggerJob() {
  try {
    // 1. Login
    const loginRes = await axios.post('https://api-gateway-production-2ec6.up.railway.app/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) {
      console.log('Nessun cookie restituito dal login');
      return;
    }
    const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
    
    // 2. Trigger
    const triggerRes = await axios.post(
      'https://api-gateway-production-2ec6.up.railway.app/api/v1/admin/scheduler/sync-images/trigger',
      {},
      {
        headers: {
          Cookie: tokenCookie
        }
      }
    );
    
    console.log("Risultato Trigger:", triggerRes.data);
    
  } catch (error: any) {
    console.error("Errore Trigger:", error.response?.data || error.message);
  }
}

triggerJob();
