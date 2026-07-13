import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

// Risolve il .env dalla root del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  ZUCCHETTI_BASE_URL: z.string().default(''),
  ZUCCHETTI_USERNAME: z.string().default(''),
  ZUCCHETTI_PASSWORD: z.string().default(''),
  ZUCCHETTI_SP_COMPANY: z.string().default('A0002'),
  ZUCCHETTI_APPLICATION_ID: z.string().default('00004'),
  ZUCCHETTI_SP_COMPANY_ISI: z.string().default('A0001'),

  SHOPIFY_STORE_URL: z.string().default(''),
  SHOPIFY_CLIENT_ID: z.string().default(''),
  SHOPIFY_CLIENT_SECRET: z.string().default(''),
  SHOPIFY_API_VERSION: z.string().default('2026-01'),
  SHOPIFY_WEBHOOK_SECRET: z.string().default(''),
  SHOPIFY_STOREFRONT_TOKEN: z.string().optional(),
  SHOPIFY_SHOP_DOMAIN: z.string().optional(),
  APP_CART_SYNC_SECRET: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  DATABASE_URL: z.string().default(''),
  DATABASE_WORKER_URL: z.string().default(''),

  REDIS_URL: z.string().default(''),
  REDIS_PUBLIC_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  SENTRY_DSN: z.string().default(''),

  ADMIN_USER: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('archelia2026'),
  JWT_SECRET: z.string().default('archelia_super_secret_jwt_key_2026_change_in_prod'),

  CLOUDINARY_URL: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),

  ENABLE_GLOBAL_WRITES: z.coerce.boolean().default(false),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Variabili ambiente non valide:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const data = result.data;
  
  // Sanitizza URL (Rimuove doppie virgolette, fix comune con dotenv/Railway)
  data.ZUCCHETTI_BASE_URL = data.ZUCCHETTI_BASE_URL.replace(/^["']|["']$/g, '').trim();
  data.SHOPIFY_STORE_URL = data.SHOPIFY_STORE_URL.replace(/^["']|["']$/g, '').trim();
  data.DATABASE_URL = data.DATABASE_URL.replace(/^["']|["']$/g, '').trim();
  data.DATABASE_WORKER_URL = data.DATABASE_WORKER_URL.replace(/^["']|["']$/g, '').trim();
  if (data.REDIS_URL) data.REDIS_URL = data.REDIS_URL.replace(/^["']|["']$/g, '').trim();

  return data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;

export function isDatabaseSafeToWrite(): boolean {
  if (env.ENABLE_GLOBAL_WRITES) return true;
  // If the DB URL contains the V2-developmt branch endpoint
  if (env.DATABASE_URL.includes('V2-developmt') || env.DATABASE_URL.includes('ag6lwn81')) {
    // Note: ep-mute-dew-ag6lwn81 is currently the developmt endpoint, so we allow it.
    // In production we should use the prod branch.
    return true; 
  }
  return false;
}
