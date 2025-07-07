import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
import input from 'input'; // Ensure installed: npm install input

dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;

let stringSession = new StringSession(process.env.SESSION || '');

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

export async function startClient() {
  try {
    await client.start({
      phoneNumber: async () => await input.text('📱 ফোন নম্বর দিন (with country code):'),
      password: async () => await input.text('🔐 2FA পাসওয়ার্ড দিন (যদি থাকে):'),
      phoneCode: async () => await input.text('📨 ফোনে পাওয়া কোড লিখুন:'),
      onError: (err) => console.error('❌ Client error:', err.message),
    });

    console.log('\n✅ TelegramClient সফলভাবে চালু হয়েছে!');
    
    const sessionString = client.session.save();
    console.log('\n🧾 নিচের SESSION কে .env ফাইলে SESSION=... হিসাবে সংরক্ষণ করুন:\n');
    console.log(sessionString);
    console.log('\n📌 উদাহরণ: SESSION=' + sessionString);
  } catch (err) {
    console.error('❌ Login ব্যর্থ:', err.message);
  }
}

export default client;
