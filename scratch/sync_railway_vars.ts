import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. Read .env
const envPath = path.resolve('.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// 2. Filter keys we want to push to Railway
const keysToSync = [
  'ZUCCHETTI_BASE_URL',
  'ZUCCHETTI_USERNAME',
  'ZUCCHETTI_PASSWORD',
  'ZUCCHETTI_SP_COMPANY',
  'ZUCCHETTI_SP_COMPANY_ISI',
  'ZUCCHETTI_APPLICATION_ID',
  'SHOPIFY_STORE_URL',
  'SHOPIFY_CLIENT_ID',
  'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_API_VERSION',
  'SHOPIFY_WEBHOOK_SECRET',
  'BREVO_API_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'TYPESENSE_URL',
  'TYPESENSE_ADMIN_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'PHOTOROOM_API_KEY',
  'PHOTOROOM_SANDBOX_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_JSON_B64',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

let setCommandArgs = '';
for (const key of keysToSync) {
  if (envConfig[key]) {
    const val = envConfig[key].replace(/"/g, '\\"');
    setCommandArgs += `${key}="${val}" `;
  }
}

const services = [
  'worker-orders-customers', 
  'worker-zucchetti-pull', 
  'api-gateway',
  'webhook-receiver',
  'worker-marketing',
  'worker-promo',
  'worker-shopify-push',
  'worker-analytics',
  'worker-equalizzatore'
];

for (const service of services) {
  console.log(`Setting variables for ${service}...`);
  try {
    const command = `npx @railway/cli variables set ${setCommandArgs} -s ${service}`;
    execSync(command, { stdio: 'inherit', env: process.env });
    console.log(`✅ Variables set for ${service}`);
  } catch (error: any) {
    console.error(`❌ Failed to set variables for ${service}`);
  }
}
