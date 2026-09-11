const fs = require('fs');

async function fetchMenu() {
  const token = '5625623cd9693cf0ace407f6ec09b740';
  const storeDomain = 'archelia-2.myshopify.com';
  let hasNextPage = true;
  let cursor = null;
  let allCollections = [];

  console.log("Fetching collections from Shopify...");
  while (hasNextPage) {
    const query = `
      query getAllCollections($after: String) {
        collections(first: 250, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
              nascondiMenu: metafield(namespace: "archelia", key: "nascondi_menu") {
                value
              }
              products(first: 1) { edges { node { id } } }
            }
          }
        }
      }
    `;
    const res = await fetch(`https://${storeDomain}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token
      },
      body: JSON.stringify({ query, variables: { after: cursor } })
    });
    
    const json = await res.json();
    const data = json.data.collections;
    allCollections.push(...data.edges.map(e => e.node));
    
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
  }
  
  console.log(`Fetched ${allCollections.length} collections. Building tree...`);

  // Build tree identically to archelia-dynamic-menu.js
  const validCollections = allCollections.filter(c => {
    const isSystem = ['frontpage', 'all'].includes(c.handle);
    const isHidden = c.nascondiMenu && c.nascondiMenu.value === 'true';
    return !isSystem && !isHidden;
  });

  const sorted = [...validCollections].sort((a, b) => a.handle.length - b.handle.length);
  const tree = [];
  const nodeMap = new Map();
  const DEFAULT_ICONS = ['box', 'tool', 'sun', 'home', 'radio', 'battery', 'feather', 'droplet'];
  let rootIndex = 0;

  for (const c of sorted) {
    const pEdges = c.products && c.products.edges ? c.products.edges : [];
    const hasProducts = pEdges.length > 0;

    // Skip "brands" node logic for now or include it
    if (c.handle.startsWith('marca-') && c.handle !== 'marca') {
      continue;
    }

    let parentNode = null;
    let parentHandleFound = "";

    for (const [existingHandle, node] of nodeMap.entries()) {
      if (c.handle.startsWith(existingHandle + '-') && existingHandle.length > parentHandleFound.length) {
        parentHandleFound = existingHandle;
        parentNode = node;
      }
    }

    const newNode = { title: c.title, handle: c.handle, children: [], hasProducts };

    if (parentNode) {
      parentNode.children.push(newNode);
    } else {
      newNode.icon = DEFAULT_ICONS[rootIndex % DEFAULT_ICONS.length];
      rootIndex++;
      tree.push(newNode);
    }
    
    nodeMap.set(c.handle, newNode);
  }

  function pruneEmptyBranches(nodes) {
    return nodes.filter(node => {
      if (node.children) {
        node.children = pruneEmptyBranches(node.children);
      }
      return node.hasProducts || (node.children && node.children.length > 0);
    });
  }

  const prunedTree = pruneEmptyBranches(tree);
  
  // Transform to match CategoryMenu.tsx format (id, name, icon)
  function transformTree(nodes) {
    return nodes.map(n => ({
      id: n.handle,
      name: n.title,
      iconName: n.icon, // We will map this to SVG in React
      children: n.children ? transformTree(n.children) : []
    }));
  }
  
  const finalTree = transformTree(prunedTree);
  
  fs.writeFileSync('apps/b2b-storefront/src/lib/taxonomy.json', JSON.stringify(finalTree, null, 2));
  console.log(`Saved ${finalTree.length} root categories to apps/b2b-storefront/src/lib/taxonomy.json`);
}

fetchMenu().catch(console.error);
