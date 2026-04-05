import express from 'express';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env') });

const { generateMistralResponse } = await import('./ai-service.js');

const app = express();
app.use(express.json({ limit: '2mb' }));

const formatterSecret = process.env.LOCAL_FORMATTER_SECRET || process.env.TRANSCRIPT_FORMATTER_SECRET || '';

const authorizeFormatterRequest = (req, res, next) => {
  if (!formatterSecret) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (token !== formatterSecret) {
    res.status(401).json({ error: 'Unauthorized formatter request.' });
    return;
  }

  next();
};

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'local-transcript-formatter'
  });
});

app.post('/format-transcript', authorizeFormatterRequest, async (req, res) => {
  const rawTranscript = `${req.body?.rawTranscript || ''}`.trim();

  if (!rawTranscript) {
    res.status(400).json({ error: 'rawTranscript is required.' });
    return;
  }

  try {
    const output = await generateMistralResponse(rawTranscript, { isFormattingMode: true });
    res.json({ success: true, output });
  } catch (error) {
    console.error('Local formatter failed:', error);
    res.status(500).json({ error: error.message || 'Transcript formatting failed.' });
  }
});

app.post('/generate', authorizeFormatterRequest, async (req, res) => {
  const prompt = `${req.body?.prompt || ''}`.trim();
  const options = req.body?.options || false;

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required.' });
    return;
  }

  try {
    const output = await generateMistralResponse(prompt, options);
    res.json({ success: true, output });
  } catch (error) {
    console.error('Local formatter generation failed:', error);
    res.status(500).json({ error: error.message || 'Generation failed.' });
  }
});

const PORT = Number(process.env.LOCAL_FORMATTER_PORT || process.env.PORT || 8080);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local transcript formatter running on http://0.0.0.0:${PORT}`);
});
