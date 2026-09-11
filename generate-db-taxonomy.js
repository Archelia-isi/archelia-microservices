const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Fetching taxonomy from Neon DB...');
  
  // 1. Level 1 (Macro)
  const l1Res = await pool.query('SELECT code, name FROM product_categories');
  const level1 = l1Res.rows.reduce((acc, c) => { acc[c.code] = c.name; return acc; }, {});
  
  // 2. Level 2 (Family)
  const l2Res = await pool.query('SELECT code, name FROM families');
  const level2 = l2Res.rows.reduce((acc, f) => { acc[f.code] = f.name; return acc; }, {});
  
  // 3. Level 3 (Homogeneous Category)
  const l3Res = await pool.query('SELECT code, name FROM homogeneous_categories');
  const level3 = l3Res.rows.reduce((acc, c) => { acc[c.code] = c.name; return acc; }, {});

  // 4. Map relationships from Products
  const relsRes = await pool.query(`
    SELECT DISTINCT "productGroup" as l1, family as l2, category as l3
    FROM products
    WHERE "productGroup" IS NOT NULL
  `);
  
  const tree = [];
  const DEFAULT_ICONS = ['box', 'tool', 'sun', 'home', 'radio', 'battery', 'feather', 'droplet'];
  
  const mapL1 = {};
  
  for (const row of relsRes.rows) {
    if (!row.l1) continue;
    
    if (!mapL1[row.l1]) {
      mapL1[row.l1] = {
        id: row.l1,
        name: level1[row.l1] || row.l1,
        families: {}
      };
    }
    
    if (row.l2) {
      if (!mapL1[row.l1].families[row.l2]) {
        mapL1[row.l1].families[row.l2] = {
          id: row.l2,
          name: level2[row.l2] || row.l2,
          cats: new Set()
        };
      }
      
      if (row.l3) {
        mapL1[row.l1].families[row.l2].cats.add(row.l3);
      }
    }
  }
  
  let rootIndex = 0;
  for (const code1 of Object.keys(mapL1).sort()) {
    const node1 = mapL1[code1];
    const outNode1 = {
      id: node1.id,
      name: node1.name,
      iconName: DEFAULT_ICONS[rootIndex % DEFAULT_ICONS.length],
      children: []
    };
    rootIndex++;
    
    for (const code2 of Object.keys(node1.families).sort()) {
      const node2 = node1.families[code2];
      const outNode2 = {
        id: node2.id,
        name: node2.name,
        children: []
      };
      
      for (const code3 of Array.from(node2.cats).sort()) {
        outNode2.children.push({
          id: code3,
          name: level3[code3] || code3
        });
      }
      
      outNode1.children.push(outNode2);
    }
    
    tree.push(outNode1);
  }
  
  fs.writeFileSync('apps/b2b-storefront/src/lib/taxonomy.json', JSON.stringify(tree, null, 2));
  console.log(`Saved ${tree.length} root categories to apps/b2b-storefront/src/lib/taxonomy.json`);
  
  process.exit(0);
}

run().catch(console.error);
