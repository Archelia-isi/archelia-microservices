import crypto from 'crypto';
import { env } from '@archelia/core';

async function sendWebhook(topic: string, endpoint: string, payloadObj: any) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) throw new Error("Missing SHOPIFY_WEBHOOK_SECRET");
  
  const payloadStr = JSON.stringify(payloadObj);
  const hash = crypto.createHmac('sha256', secret).update(payloadStr, 'utf8').digest('base64');
  
  console.log(`\nInviando webhook ${topic}...`);
  const res = await fetch(`https://webhook-receiver-production-f7d5.up.railway.app/api/webhooks/shopify/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-topic': topic,
      'x-shopify-shop-domain': 'archelia-2.myshopify.com',
      'x-shopify-hmac-sha256': hash
    },
    body: payloadStr
  });
  
  console.log(`Status: ${res.status}`);
  const text = await res.text();
  console.log(`Response: ${text}`);
}

async function main() {
  const timestamp = Date.now();
  const shopifyCustomerId = 22220000 + (timestamp % 100000);
  const shopifyOrderId = 88880000 + (timestamp % 100000);
  
  const customerPayload = {
    id: shopifyCustomerId,
    email: `fake${timestamp}@archeliatest.com`,
    first_name: "TestUser",
    last_name: "FakeName",
    phone: "3331112222",
    addresses: [
      {
        address1: "Via Falsa 123",
        city: "Roma",
        province: "RM",
        zip: "00100",
        country: "Italy",
        phone: "3331112222",
        name: "TestUser FakeName"
      }
    ],
    default_address: {
      address1: "Via Falsa 123",
      city: "Roma",
      province: "RM",
      zip: "00100",
      country: "Italy",
      phone: "3331112222",
      name: "TestUser FakeName"
    },
    metafields: [
      { key: "codice_fiscale", value: "TSTRSS80A01H501U", namespace: "custom" }
    ]
  };

  const orderPayload = {
    id: shopifyOrderId,
    order_number: `99${(timestamp % 1000)}`,
    name: `#99${(timestamp % 1000)}`,
    total_price: "45.99",
    subtotal_price: "40.99",
    total_shipping_price_set: { shop_money: { amount: "5.00", currency_code: "EUR" } },
    customer: customerPayload,
    shipping_address: customerPayload.default_address,
    billing_address: customerPayload.default_address,
    line_items: [
      {
        id: 11112222 + (timestamp % 10000),
        title: "Prodotto Test Webhook",
        sku: "TEST-SKU-WEBHOOK-01",
        quantity: 1,
        price: "40.99"
      }
    ]
  };

  await sendWebhook('customers/create', 'customers/create', customerPayload);
  
  console.log('Attendo 2 secondi prima di inviare l\'ordine...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await sendWebhook('orders/create', 'orders/create', orderPayload);
  
  console.log(`\nTest Completato. Cliente ID: ${shopifyCustomerId} - Ordine ID: ${shopifyOrderId}`);
}

main().catch(console.error);
