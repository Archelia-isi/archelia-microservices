import fs from 'fs';

let content = fs.readFileSync('apps/api-gateway/src/routes/admin/b2bUsers.ts', 'utf8');

content = content.replace(/fastify\.get\('\/elmark-groups'/, "app.get('/b2b-users/elmark-groups'");

fs.writeFileSync('apps/api-gateway/src/routes/admin/b2bUsers.ts', content);
