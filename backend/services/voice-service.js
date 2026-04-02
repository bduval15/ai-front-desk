import { Buffer } from 'buffer';
import { URL, URLSearchParams } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import Call from '../models/Call.js';

const STREAM_PATH = '/api/telephony/media-stream';
const ACTIVE_SESSIONS = new Map();

const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-mini-realtime-preview';
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-live-2.5-flash';
const DEFAULT_GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const VOICE_ENGINE_PROVIDER = (process.env.VOICE_AI_PROVIDER || 'openai').toLowerCase();

const TERMINAL_STATUSES = new Set([
  'Completed',
  'Confirmed',
  'Rejected',
  'Busy',
  'Voicemail',
  'No Answer',
  'Failed',
  'Canceled'
]);

const noop = () => undefined;

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const escapeXml = (value = '') => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const appendEvent = (list = [], event) => {
  const next = [...list, event];
  return next.slice(-40);
};

const withTrailingSlashRemoved = (value) => value?.replace(/\/+$/, '') || '';

const normalizeGeminiWsUrl = (configuredUrl = '') => {
  if (!configuredUrl) {
    return DEFAULT_GEMINI_LIVE_URL;
  }

  if (configuredUrl.includes('GenericService/MultimodalLive')) {
    return DEFAULT_GEMINI_LIVE_URL;
  }

  return configuredUrl;
};

const normalizeGeminiModelName = (modelName = GEMINI_LIVE_MODEL) => (
  modelName.startsWith('models/') ? modelName : `models/${modelName}`
);

const getTwilioAuthHeader = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured.');
  }

  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
};

export const isTerminalCallStatus = (status) => TERMINAL_STATUSES.has(status);

export const resolvePublicBaseUrl = (req) => {
  const configuredBaseUrl = withTrailingSlashRemoved(
    process.env.PUBLIC_BASE_URL || process.env.SERVER_PUBLIC_BASE_URL || process.env.BACKEND_PUBLIC_URL
  );

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const host = req.get?.('host') || req.headers.host;
  const protocol = req.get?.('x-forwarded-proto') || req.protocol || 'http';

  if (!host) {
    return '';
  }

  return `${protocol}://${host}`;
};

const buildMediaStreamUrl = (baseUrl, callId) => {
  const mediaUrl = new URL(baseUrl);
  mediaUrl.protocol = mediaUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  mediaUrl.pathname = STREAM_PATH;
  mediaUrl.searchParams.set('callId', callId);
  return mediaUrl.toString();
};

export const buildCallTwiml = ({ baseUrl, callId, goal }) => {
  const streamUrl = buildMediaStreamUrl(baseUrl, callId);
  const safeGoal = escapeXml(goal);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting FrontDesk AI.</Say>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="callId" value="${escapeXml(callId)}" />
      <Parameter name="goal" value="${safeGoal}" />
    </Stream>
  </Connect>
</Response>`;
};

const normalizeTwilioStatus = ({ callStatus = '', answeredBy = '' }) => {
  const normalizedAnsweredBy = answeredBy.toLowerCase();
  const normalizedStatus = callStatus.toLowerCase();

  if (normalizedAnsweredBy.includes('machine')) {
    return 'Voicemail';
  }

  switch (normalizedStatus) {
    case 'busy':
      return 'Busy';
    case 'no-answer':
      return 'No Answer';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    case 'ringing':
      return 'Ringing';
    case 'queued':
      return 'Queued';
    default:
      return callStatus || 'Queued';
  }
};

export const initiateOutboundCall = async ({ callId, phoneNumber, goal, baseUrl }) => {
  if (!phoneNumber || !goal) {
    throw new Error('Phone number and goal are required to start a call.');
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  }

  if (!baseUrl) {
    throw new Error('A public backend base URL is required for Twilio webhooks.');
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const requestUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const twimlUrl = new URL(`/api/telephony/twiml/${callId}`, `${baseUrl}/`).toString();
  const statusUrl = new URL(`/api/telephony/status/${callId}`, `${baseUrl}/`).toString();

  const body = new URLSearchParams({
    To: phoneNumber,
    From: fromNumber,
    Url: twimlUrl,
    StatusCallback: statusUrl,
    StatusCallbackMethod: 'POST',
    MachineDetection: process.env.TWILIO_MACHINE_DETECTION || 'DetectMessageEnd'
  });

  ['initiated', 'ringing', 'answered', 'completed'].forEach((eventName) => {
    body.append('StatusCallbackEvent', eventName);
  });

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: getTwilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const responseText = await response.text();
  const parsed = safeJsonParse(responseText, {});

  if (!response.ok) {
    const message = parsed?.message || responseText || 'Twilio failed to accept the outbound call.';
    throw new Error(message);
  }

  return {
    providerCallSid: parsed.sid || '',
    callStatus: normalizeTwilioStatus({ callStatus: parsed.status }),
    rawResponse: parsed
  };
};

export const handleCallStatusUpdate = async ({ callId, payload, onCallEnded = noop }) => {
  const call = await Call.findById(callId);

  if (!call) {
    return { status: 'Missing' };
  }

  const nextStatus = normalizeTwilioStatus({
    callStatus: payload.CallStatus,
    answeredBy: payload.AnsweredBy
  });

  const rawTelephonyData = {
    ...(call.rawTelephonyData || {}),
    twilio: {
      ...((call.rawTelephonyData || {}).twilio || {}),
      statusCallbacks: appendEvent(
        ((call.rawTelephonyData || {}).twilio || {}).statusCallbacks,
        {
          at: new Date().toISOString(),
          callStatus: payload.CallStatus || '',
          answeredBy: payload.AnsweredBy || '',
          callDuration: payload.CallDuration || '',
          callSid: payload.CallSid || ''
        }
      )
    }
  };

  call.providerCallSid = payload.CallSid || call.providerCallSid;
  call.answeredBy = payload.AnsweredBy || call.answeredBy;
  call.durationSeconds = Number(payload.CallDuration || call.durationSeconds || 0);
  call.callStatus = nextStatus;
  call.rawTelephonyData = rawTelephonyData;
  await call.save();

  if (isTerminalCallStatus(nextStatus)) {
    const liveSession = ACTIVE_SESSIONS.get(callId);
    if (liveSession) {
      await liveSession.stop('twilio-status');
    }

    await onCallEnded(callId, {
      callStatus: nextStatus,
      answeredBy: payload.AnsweredBy || ''
    });
  }

  return { status: nextStatus };
};

export const registerVoiceSocketServer = ({ server, onCallEnded = noop }) => {
  const mediaWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, 'http://localhost');

    if (requestUrl.pathname !== STREAM_PATH) {
      return;
    }

    mediaWss.handleUpgrade(request, socket, head, (websocket) => {
      mediaWss.emit('connection', websocket, request);
    });
  });

  mediaWss.on('connection', async (socket, request) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const callId = requestUrl.searchParams.get('callId');

    const session = new MediaStreamSession({
      callId,
      twilioSocket: socket,
      onCallEnded
    });

    if (callId) {
      try {
        await session.bootstrap(callId);
      } catch (error) {
        socket.close();
        return;
      }
    }

    socket.on('message', async (raw) => {
      await session.handleTwilioMessage(raw.toString());
    });

    socket.on('close', async () => {
      await session.stop('twilio-socket-closed');
    });

    socket.on('error', async (error) => {
      await session.recordProviderError(error.message);
      await session.stop('twilio-socket-error');
    });
  });
};

class MediaStreamSession {
  constructor({ callId, twilioSocket, onCallEnded }) {
    this.callId = callId || '';
    this.twilioSocket = twilioSocket;
    this.onCallEnded = onCallEnded;
    this.call = null;
    this.streamSid = '';
    this.providerBridge = null;
    this.transcriptEntries = [];
    this.telemetry = {
      provider: VOICE_ENGINE_PROVIDER,
      twilio: { events: [] },
      voiceEngine: { events: [] }
    };
    this.hasStopped = false;
  }

  async bootstrap(explicitCallId = '') {
    const nextCallId = explicitCallId || this.callId;

    if (!nextCallId) {
      throw new Error('No callId was supplied for the media stream session.');
    }

    this.callId = nextCallId;
    this.call = await Call.findById(this.callId);

    if (!this.call) {
      throw new Error(`Call ${this.callId} was not found.`);
    }

    this.transcriptEntries = Array.isArray(this.call.transcriptEntries)
      ? [...this.call.transcriptEntries]
      : [];

    ACTIVE_SESSIONS.set(this.callId, this);
  }

  async handleTwilioMessage(rawMessage) {
    const payload = safeJsonParse(rawMessage, {});

    if (!payload?.event) {
      return;
    }

    this.telemetry.twilio.events = appendEvent(this.telemetry.twilio.events, {
      at: new Date().toISOString(),
      type: payload.event,
      sequenceNumber: payload.sequenceNumber || null
    });

    switch (payload.event) {
      case 'start':
        await this.handleStart(payload.start || {});
        break;
      case 'media':
        if (payload.media?.payload) {
          this.providerBridge?.appendIncomingAudio(payload.media.payload);
        }
        break;
      case 'stop':
        await this.stop('twilio-stop');
        break;
      default:
        break;
    }
  }

  async handleStart(startPayload) {
    const parameterCallId = startPayload.customParameters?.callId || startPayload.customParameters?.CallId || '';

    if (!this.call) {
      await this.bootstrap(parameterCallId);
    }

    this.streamSid = startPayload.streamSid || this.streamSid;

    this.call.providerCallSid = startPayload.callSid || this.call.providerCallSid;
    this.call.callStatus = 'In Progress';
    this.call.rawTelephonyData = {
      ...(this.call.rawTelephonyData || {}),
      twilio: {
        ...((this.call.rawTelephonyData || {}).twilio || {}),
        streamSid: this.streamSid,
        start: {
          at: new Date().toISOString(),
          callSid: startPayload.callSid || '',
          customParameters: startPayload.customParameters || {}
        }
      }
    };
    await this.call.save();

    this.providerBridge = createVoiceProviderBridge({
      session: this,
      goal: this.call.goal
    });

    await this.providerBridge.connect();
  }

  async addTranscriptEntry(speaker, text) {
    const trimmedText = (text || '').trim();

    if (!trimmedText) {
      return;
    }

    this.transcriptEntries.push({
      speaker,
      text: trimmedText,
      createdAt: new Date()
    });

    await this.persistTranscript();
  }

  async persistTranscript() {
    if (!this.call) {
      return;
    }

    const rawTranscript = this.transcriptEntries
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join('\n');

    this.call.rawTranscript = rawTranscript;
    this.call.transcript = rawTranscript;
    this.call.transcriptEntries = this.transcriptEntries;
    this.call.rawTelephonyData = {
      ...(this.call.rawTelephonyData || {}),
      twilio: {
        ...((this.call.rawTelephonyData || {}).twilio || {}),
        events: this.telemetry.twilio.events
      },
      voiceEngine: {
        ...((this.call.rawTelephonyData || {}).voiceEngine || {}),
        provider: VOICE_ENGINE_PROVIDER,
        events: this.telemetry.voiceEngine.events
      }
    };
    await this.call.save();
  }

  sendAudioToTwilio(base64Payload) {
    if (!this.streamSid || this.twilioSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.twilioSocket.send(JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: base64Payload }
    }));
  }

  clearTwilioAudio() {
    if (!this.streamSid || this.twilioSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.twilioSocket.send(JSON.stringify({
      event: 'clear',
      streamSid: this.streamSid
    }));
  }

  async recordProviderEvent(type, details = {}) {
    this.telemetry.voiceEngine.events = appendEvent(this.telemetry.voiceEngine.events, {
      at: new Date().toISOString(),
      type,
      details
    });
  }

  async recordProviderError(message) {
    if (!this.call) {
      return;
    }

    this.call.processingError = message;
    await this.recordProviderEvent('error', { message });
    await this.persistTranscript();
  }

  async stop(reason) {
    if (this.hasStopped) {
      return;
    }

    this.hasStopped = true;
    if (this.callId) {
      ACTIVE_SESSIONS.delete(this.callId);
    }
    this.providerBridge?.close();

    await this.persistTranscript();

    if (!this.callId || !this.call) {
      return;
    }

    await this.onCallEnded(this.callId, {
      rawTranscript: this.call.rawTranscript,
      callStatus: this.call.callStatus || 'Completed',
      stopReason: reason
    });
  }
}

const buildVoiceInstructions = (goal) => [
  'You are FrontDesk AI, a concise and professional front desk caller.',
  `Goal: ${goal}`,
  'Keep responses short, natural, and phone-friendly.',
  'Identify whether the outcome is confirmed, rejected, busy, voicemail, or unresolved.',
  'If you reach voicemail, leave a brief message and stop.'
].join(' ');

const createVoiceProviderBridge = ({ session, goal }) => {
  if (VOICE_ENGINE_PROVIDER === 'gemini') {
    return new GeminiLiveBridge({ session, goal });
  }

  return new OpenAIRealtimeBridge({ session, goal });
};

class OpenAIRealtimeBridge {
  constructor({ session, goal }) {
    this.session = session;
    this.goal = goal;
    this.socket = null;
  }

  async connect() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(OPENAI_REALTIME_MODEL)}`;

    this.socket = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    await new Promise((resolve, reject) => {
      this.socket.once('open', resolve);
      this.socket.once('error', reject);
    });

    this.socket.on('message', (data) => {
      void this.handleServerMessage(data.toString());
    });

    this.socket.on('error', (error) => {
      void this.session.recordProviderError(error.message);
    });

    this.send({
      type: 'session.update',
      session: {
        instructions: buildVoiceInstructions(this.goal),
        voice: process.env.OPENAI_VOICE || 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: {
          model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'
        },
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: 650
        }
      }
    });

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'The recipient has answered the phone. Start the conversation now.'
          }
        ]
      }
    });

    this.send({ type: 'response.create' });
    await this.session.recordProviderEvent('openai-connected', { model: OPENAI_REALTIME_MODEL });
  }

  appendIncomingAudio(base64Payload) {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Payload
    });
  }

  async handleServerMessage(rawMessage) {
    const event = safeJsonParse(rawMessage, {});

    if (!event?.type) {
      return;
    }

    if (event.type === 'input_audio_buffer.speech_started') {
      this.session.clearTwilioAudio();
    }

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      await this.session.addTranscriptEntry('Caller', event.transcript || '');
    }

    if (event.type === 'response.output_audio.delta' && event.delta) {
      this.session.sendAudioToTwilio(event.delta);
    }

    if (event.type === 'response.output_audio_transcript.done') {
      await this.session.addTranscriptEntry('FrontDesk AI', event.transcript || '');
    }

    if (event.type === 'response.output_text.done') {
      await this.session.addTranscriptEntry('FrontDesk AI', event.text || '');
    }

    if (event.type === 'error') {
      await this.session.recordProviderError(event.error?.message || 'Realtime voice engine error');
    }
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

class GeminiLiveBridge {
  constructor({ session, goal }) {
    this.session = session;
    this.goal = goal;
    this.socket = null;
  }

  async connect() {
    const configuredUrl = normalizeGeminiWsUrl(process.env.GEMINI_LIVE_WS_URL);
    const bearerToken = process.env.GEMINI_BEARER_TOKEN || '';
    const inferredApiKey = bearerToken.startsWith('AIza') ? bearerToken : '';
    const explicitApiKey = process.env.GEMINI_API_KEY || '';
    const geminiUrl = new URL(configuredUrl);
    const apiKey = explicitApiKey || inferredApiKey;

    const headers = {};

    if (apiKey) {
      geminiUrl.searchParams.set('key', apiKey);
    } else if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    this.socket = new WebSocket(geminiUrl.toString(), { headers });

    await new Promise((resolve, reject) => {
      this.socket.once('open', resolve);
      this.socket.once('error', reject);
    });

    this.socket.on('message', (data) => {
      void this.handleServerMessage(data.toString());
    });

    this.socket.on('error', (error) => {
      void this.session.recordProviderError(error.message);
    });

    this.send({
      setup: {
        model: normalizeGeminiModelName(GEMINI_LIVE_MODEL),
        generationConfig: {
          responseModalities: ['AUDIO']
        },
        systemInstruction: buildVoiceInstructions(this.goal)
      }
    });

    await this.session.recordProviderEvent('gemini-connected', { model: GEMINI_LIVE_MODEL });
  }

  appendIncomingAudio(base64Payload) {
    const pcm16Base64 = mulaw8kToPcm16kBase64(base64Payload);

    this.send({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: pcm16Base64
          }
        ]
      }
    });
  }

  async handleServerMessage(rawMessage) {
    const event = safeJsonParse(rawMessage, {});

    if (event.inputTranscription?.text) {
      await this.session.addTranscriptEntry('Caller', event.inputTranscription.text);
    }

    if (event.outputTranscription?.text) {
      await this.session.addTranscriptEntry('FrontDesk AI', event.outputTranscription.text);
    }

    const parts = event.serverContent?.modelTurn?.parts || [];
    parts.forEach((part) => {
      if (part.inlineData?.data) {
        const twilioAudioPayload = pcm24kBase64ToMulaw8kBase64(part.inlineData.data);
        this.session.sendAudioToTwilio(twilioAudioPayload);
      }
    });
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

const mulawToLinear = (value) => {
  const MULAW_BIAS = 0x84;
  let mulaw = ~value & 0xff;
  const sign = mulaw & 0x80;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;
  let sample = ((mantissa << 4) + 0x08) << exponent;
  sample -= MULAW_BIAS;
  return sign ? -sample : sample;
};

const linearToMulaw = (sample) => {
  const MULAW_MAX = 0x1fff;
  const MULAW_BIAS = 33;
  const sign = sample < 0 ? 0x80 : 0;
  let magnitude = Math.min(MULAW_MAX, Math.abs(sample) + MULAW_BIAS);
  let exponent = 7;

  for (let expMask = 0x400; (magnitude & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (magnitude >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
};

const bufferToInt16 = (buffer) => {
  const samples = new Int16Array(buffer.length / 2);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = buffer.readInt16LE(index * 2);
  }
  return samples;
};

const int16ToBuffer = (samples) => {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(samples[index], index * 2);
  }
  return buffer;
};

const decodeMulawBase64 = (base64Payload) => {
  const input = Buffer.from(base64Payload, 'base64');
  const samples = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    samples[index] = mulawToLinear(input[index]);
  }

  return samples;
};

const encodeMulawBase64 = (samples) => {
  const buffer = Buffer.alloc(samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    buffer[index] = linearToMulaw(samples[index]);
  }

  return buffer.toString('base64');
};

const resample = (samples, fromRate, toRate) => {
  if (fromRate === toRate) {
    return samples;
  }

  const ratio = fromRate / toRate;
  const nextLength = Math.max(1, Math.round(samples.length / ratio));
  const nextSamples = new Int16Array(nextLength);

  for (let index = 0; index < nextLength; index += 1) {
    const sourceIndex = index * ratio;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, samples.length - 1);
    const weight = sourceIndex - lowerIndex;
    nextSamples[index] = Math.round(
      (samples[lowerIndex] || 0) * (1 - weight) + (samples[upperIndex] || 0) * weight
    );
  }

  return nextSamples;
};

const mulaw8kToPcm16kBase64 = (base64Payload) => {
  const pcm8k = decodeMulawBase64(base64Payload);
  const pcm16k = resample(pcm8k, 8000, 16000);
  return int16ToBuffer(pcm16k).toString('base64');
};

const pcm24kBase64ToMulaw8kBase64 = (base64Payload) => {
  const pcm24k = bufferToInt16(Buffer.from(base64Payload, 'base64'));
  const pcm8k = resample(pcm24k, 24000, 8000);
  return encodeMulawBase64(pcm8k);
};
