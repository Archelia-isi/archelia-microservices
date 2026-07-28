const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'test_admin', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log(token);
