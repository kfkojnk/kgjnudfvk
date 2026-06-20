// server.js
// Простой бекенд: принимает файлы от Mini App и пересылает их тебе в Telegram
// с подписью username/имени отправителя.

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();

// ====== НАСТРОЙКИ — заполни перед запуском ======
const BOT_TOKEN = '8999773764:AAE1lOz3KzFLTFcRISgiOvAuLtZUHlTdeFA';
const OWNER_CHAT_ID = '8479601897'; // куда придут файлы (твой личный chat_id)
const PORT = process.env.PORT || 3000;
// ===================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB на файл (лимит самого Telegram Bot API)
});

app.use(express.json());

// Разрешаем запросы со страницы Mini App (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { username, first_name, user_id } = req.body;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'no files' });
    }

    const who = username
      ? `@${username}`
      : (first_name || 'Без имени');
    const idLine = user_id ? `\nID: ${user_id}` : '';

    // 1. Отправляем текстовое сообщение с инфо об отправителе
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: OWNER_CHAT_ID,
      text: `📥 Новый материал от ${who}${idLine}\nФайлов: ${files.length}`
    });

    // 2. Отправляем каждый файл документом
    for (const file of files) {
      const form = new FormData();
      form.append('chat_id', OWNER_CHAT_ID);
      form.append('caption', `от ${who}`);
      form.append('document', file.buffer, { filename: file.originalname });

      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
        form,
        { headers: form.getHeaders(), maxBodyLength: Infinity }
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Upload error:', err.response?.data || err.message);
    res.status(500).json({ error: 'upload failed' });
  }
});

app.get('/', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
