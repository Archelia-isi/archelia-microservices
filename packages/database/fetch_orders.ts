import axios from 'axios';

async function fetchOrders() {
  try {
    const loginRes = await axios.post('https://api-gateway-production-2ec6.up.railway.app/api/auth/login', {
      username: 'admin',
      password: 'password123' // Replace with actual or see if we can bypass
    });
    console.log('Login:', loginRes.headers['set-cookie']);
    
    // We don't have the password easily available, let's just query the DB directly to see if they match the filters!
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}
fetchOrders();
