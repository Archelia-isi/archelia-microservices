const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env', 'utf-8');
const lines = envFile.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  
  if (key === 'RAILWAY_TOKEN' || key === 'RAILWAY_SERVICE_NAME') {
    continue;
  }
  
  console.log(`Setting ${key}...`);
  try {
    execSync(`npx -y -p @railway/cli railway variable set "${key}" --service worker-suppliers-pull --stdin --skip-deploys`, {
      input: val,
      env: { ...process.env, RAILWAY_TOKEN: 'fa51a8f4-ad57-4f71-96da-bf72297723a1' }
    });
  } catch (e) {
    console.error(`Failed to set ${key}: ${e.message}`);
  }
}
console.log('Done!');
