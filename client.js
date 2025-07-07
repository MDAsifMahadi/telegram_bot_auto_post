import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

export async function startClient() {
  await client.start({
    phoneNumber: () => Promise.resolve(''), // প্রয়োজন নাই কারণ session আগে থেকেই আছে
    password: () => Promise.resolve(''),
    phoneCode: () => Promise.resolve(''),
    onError: (err) => console.error('❌ Client error:', err.message),
  });

  console.log('✅ TelegramClient চালু হয়েছে');
}

export default client;
