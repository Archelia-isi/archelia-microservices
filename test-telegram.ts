import fetch from 'node-fetch';

async function testTelegram() {
  const token = '8918642135:AAHtPHBOpUb593ol88j0xIStC7RVSuIDcBg';
  const chatId = '-5282295421'; // Il Chat ID che ha fornito l'utente
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  console.log(`Sto chiamando: ${url} per il chat_id: ${chatId}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Test notifica manuale',
      parse_mode: 'HTML'
    })
  });
  
  const json = await response.json();
  console.log('Risposta Telegram:', json);
}

testTelegram().catch(console.error);
