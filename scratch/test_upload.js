const fs = require('fs');
fs.writeFileSync('test_image.jpg', Buffer.alloc(1024 * 1024)); // 1MB fake image
