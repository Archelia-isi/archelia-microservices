require('dotenv').config();

const TOKEN = process.env.RAILWAY_TOKEN;
if (!TOKEN) throw new Error('No RAILWAY_TOKEN found in .env');

async function run() {
  const q = `
    query {
      projects {
        edges {
          node {
            id
            name
            environments {
              edges {
                node {
                  id
                  name
                }
              }
            }
            services {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ query: q })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run().catch(console.error);
