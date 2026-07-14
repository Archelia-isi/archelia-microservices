import { generateMjmlEmail } from './packages/ai/src/emailAi.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await generateMjmlEmail('Email di prova');
    console.log(res);
  } catch (e) {
    console.error('ERRORE:', e);
  }
}

run();
