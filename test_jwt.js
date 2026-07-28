const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: '1', username: 'admin', role: 'ADMIN' }, 'secret-key-super-sicura-1234', { expiresIn: '1h' });
console.log(token);
