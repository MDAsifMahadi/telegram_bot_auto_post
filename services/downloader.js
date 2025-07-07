import fs from 'fs';
import path from 'path';
import client from '../client.js';
import { formatMessage } from './formatter.js';

const downloadDir = 'downloads';

// যদি ফোল্ডার না থাকে, তৈরি করে
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

// মিডিয়া ডাউনলোড ফাংশন
export async function downloadMedia(message) {
  try {
    const buffer = await client.downloadMedia(message.media, {});
    const mime = message.media?.document?.mimeType || '';
    const extension = mime.startsWith('video') ? '.mp4' : '.jpg';

    const filePath = path.join(downloadDir, `media_${message.id}${extension}`);
    fs.writeFileSync(filePath, buffer);

    const caption = formatMessage(message.message || '', message.entities || []);

    return { path: filePath, mime, caption };
  } catch (err) {
    console.error('❌ মিডিয়া ডাউনলোডে সমস্যা:', err.message);
    return null;
  }
}

// মিডিয়া ফাইল ডিলিট করার ফাংশন
export function cleanupMedia(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 ডিলিট: ${filePath}`);
    }
  } catch (err) {
    console.error('❌ মিডিয়া ডিলিট সমস্যা:', err.message);
  }
}
