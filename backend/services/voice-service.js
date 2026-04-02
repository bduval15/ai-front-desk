import { Buffer } from 'buffer';
import { URL, URLSearchParams } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import Call from '../models/Call.js';

const STREAM_PATH = '/api/telephony/media-stream';
const ACTIVE_SESSIONS = new Map();

const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const VOICE_ENGINE_PROVIDER = 'gemini';
const GEMINI_PREBUILT_VOICE = process.env.GEMINI_VOICE || 'Kore';
const GEMINI_SETUP_TIMEOUT_MS = Number(process.env.GEMINI_SETUP_TIMEOUT_MS || 5000);
const TRANSCRIPT_PERSIST_DEBOUNCE_MS = Number(process.env.TRANSCRIPT_PERSIST_DEBOUNCE_MS || 150);
const TWILIO_AUDIO_FRAME_MS = Number(process.env.TWILIO_AUDIO_FRAME_MS || 20);
const TWILIO_AUDIO_FRAME_BYTES = Math.max(1, Math.round((8000 * TWILIO_AUDIO_FRAME_MS) / 1000));
const TWILIO_AUDIO_MIN_BUFFER_MS = Number(process.env.TWILIO_AUDIO_MIN_BUFFER_MS || 80);
const TWILIO_AUDIO_REBUFFER_GRACE_MS = Number(process.env.TWILIO_AUDIO_REBUFFER_GRACE_MS || 320);
const TWILIO_AUDIO_MIN_BUFFER_BYTES = Math.max(
  TWILIO_AUDIO_FRAME_BYTES,
  Math.round((8000 * TWILIO_AUDIO_MIN_BUFFER_MS) / 1000)
);
const GEMINI_MODEL_ALIASES = new Map([
  ['gemini-live-2.5-flash', 'gemini-2.5-flash-native-audio-preview-12-2025'],
  ['gemini-live-2.5-flash-preview', 'gemini-2.5-flash-native-audio-preview-12-2025']
]);

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

const normalizeTranscriptText = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizeTranscriptComparison = (value = '') => normalizeTranscriptText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const mergeTranscriptTexts = (previousText = '', nextText = '') => {
  const previous = normalizeTranscriptText(previousText);
  const next = normalizeTranscriptText(nextText);

  if (!previous) {
    return next;
  }

  if (!next) {
    return previous;
  }

  if (next.startsWith(previous)) {
    return next;
  }

  if (previous.startsWith(next)) {
    return previous;
  }

  const shouldJoinWithoutSpace = /[\s([{'"-]$/.test(previous) || /^[,.;:!?)}\]'"]/.test(next);
  return `${previous}${shouldJoinWithoutSpace ? '' : ' '}${next}`.replace(/\s+/g, ' ').trim();
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

const normalizeGeminiModelName = (modelName = GEMINI_LIVE_MODEL) => {
  const normalizedModelName = GEMINI_MODEL_ALIASES.get(modelName) || modelName;
  return normalizedModelName.startsWith('models/')
    ? normalizedModelName
    : `models/${normalizedModelName}`;
};

const isGemini31LiveModel = (modelName = GEMINI_LIVE_MODEL) => (
  normalizeGeminiModelName(modelName).includes('gemini-3.1-flash-live-preview')
);

const buildGeminiThinkingConfig = (modelName = GEMINI_LIVE_MODEL) => {
  if (isGemini31LiveModel(modelName)) {
    return {
      thinkingConfig: {
        thinkingLevel: process.env.GEMINI_THINKING_LEVEL || 'minimal',
        includeThoughts: false
      }
    };
  }

  return {
    thinkingConfig: {
      thinkingBudget: Number(process.env.GEMINI_THINKING_BUDGET || 0)
    }
  };
};

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
      try {
        await session.handleTwilioMessage(raw.toString());
      } catch (error) {
        await session.recordProviderError(error.message);
        await session.stop('twilio-message-error');
      }
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
    this.persistQueue = Promise.resolve();
    this.persistTimeout = null;
    this.outboundAudioBuffer = Buffer.alloc(0);
    this.outboundAudioInterval = null;
    this.outboundAudioPrimed = false;
    this.lastOutboundAudioAt = 0;
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

    try {
      await this.providerBridge.connect();
    } catch (error) {
      await this.recordProviderError(error.message);
      await this.stop('voice-provider-connect-failed');
    }
  }

  async addTranscriptEntry(speaker, text) {
    const trimmedText = normalizeTranscriptText(text);

    if (!trimmedText) {
      return;
    }

    const previousEntry = this.transcriptEntries[this.transcriptEntries.length - 1];
    const normalizedNext = normalizeTranscriptComparison(trimmedText);

    if (previousEntry?.speaker === speaker) {
      const normalizedPrevious = normalizeTranscriptComparison(previousEntry.text);
      const previousTimestamp = new Date(previousEntry.createdAt || 0).getTime();
      const elapsedMs = Date.now() - previousTimestamp;

      if (normalizedPrevious === normalizedNext) {
        if (trimmedText.length > previousEntry.text.length) {
          previousEntry.text = trimmedText;
          previousEntry.createdAt = new Date();
          this.scheduleTranscriptPersist();
        }
        return;
      }

      if (
        elapsedMs < 5000 &&
        (
          trimmedText.startsWith(previousEntry.text) ||
          previousEntry.text.startsWith(trimmedText) ||
          trimmedText.length <= 32 ||
          !/[.!?]["']?$/.test(previousEntry.text)
        )
      ) {
        previousEntry.text = mergeTranscriptTexts(previousEntry.text, trimmedText);
        previousEntry.createdAt = new Date();
        this.scheduleTranscriptPersist();
        return;
      }
    }

    this.transcriptEntries.push({
      speaker,
      text: trimmedText,
      createdAt: new Date()
    });

    this.scheduleTranscriptPersist();
  }

  scheduleTranscriptPersist() {
    if (this.persistTimeout || !this.call) {
      return;
    }

    this.persistTimeout = setTimeout(() => {
      this.persistTimeout = null;
      void this.persistTranscript();
    }, TRANSCRIPT_PERSIST_DEBOUNCE_MS);
  }

  async persistTranscript() {
    if (!this.call) {
      return;
    }

    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
      this.persistTimeout = null;
    }

    this.persistQueue = this.persistQueue
      .catch(() => undefined)
      .then(async () => {
        if (!this.call) {
          return;
        }

        const rawTranscript = this.transcriptEntries
          .map((entry) => `${entry.speaker}: ${entry.text}`)
          .join('\n');

        this.call.rawTranscript = rawTranscript;
        this.call.transcript = rawTranscript;
        this.call.transcriptEntries = [...this.transcriptEntries];
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
      });

    await this.persistQueue;
  }

  startOutboundAudioPump() {
    if (this.outboundAudioInterval) {
      return;
    }

    this.outboundAudioInterval = setInterval(() => {
      if (!this.streamSid || this.twilioSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (this.outboundAudioBuffer.length === 0) {
        if (Date.now() - this.lastOutboundAudioAt > TWILIO_AUDIO_REBUFFER_GRACE_MS) {
          this.outboundAudioPrimed = false;
        }
        return;
      }

      if (!this.outboundAudioPrimed) {
        if (this.outboundAudioBuffer.length < TWILIO_AUDIO_MIN_BUFFER_BYTES) {
          return;
        }

        this.outboundAudioPrimed = true;
      }

      const nextChunk = this.outboundAudioBuffer.subarray(0, TWILIO_AUDIO_FRAME_BYTES);
      this.outboundAudioBuffer = this.outboundAudioBuffer.subarray(nextChunk.length);

      this.twilioSocket.send(JSON.stringify({
        event: 'media',
        streamSid: this.streamSid,
        media: { payload: nextChunk.toString('base64') }
      }));
    }, TWILIO_AUDIO_FRAME_MS);
  }

  stopOutboundAudioPump() {
    if (this.outboundAudioInterval) {
      clearInterval(this.outboundAudioInterval);
      this.outboundAudioInterval = null;
    }

    this.outboundAudioPrimed = false;
  }

  sendAudioToTwilio(base64Payload) {
    if (!this.streamSid || this.twilioSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const nextAudio = Buffer.from(base64Payload, 'base64');
    if (nextAudio.length === 0) {
      return;
    }

    this.outboundAudioBuffer = Buffer.concat([this.outboundAudioBuffer, nextAudio]);
    this.lastOutboundAudioAt = Date.now();
    this.startOutboundAudioPump();
  }

  clearTwilioAudio() {
    if (!this.streamSid || this.twilioSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.outboundAudioBuffer = Buffer.alloc(0);
    this.outboundAudioPrimed = false;
    this.lastOutboundAudioAt = 0;

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
    this.stopOutboundAudioPump();
    this.outboundAudioBuffer = Buffer.alloc(0);
    this.outboundAudioPrimed = false;
    this.lastOutboundAudioAt = 0;
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
  'You are FrontDesk AI, calling on behalf of the business as a concise and professional outbound caller.',
  'You are placing an outbound call, not receiving an inbound support call or help request.',
  `Goal: ${goal}`,
  'Keep responses short, natural, and phone-friendly.',
  'In your first turn, briefly introduce yourself and immediately explain the exact reason for the call.',
  'State the purpose first, then ask the next direct question needed to complete the goal.',
  'Do not ask generic inbound-support questions like "How can I help you?" or "What can I do for you?"',
  'Never reveal internal reasoning, planning, chain-of-thought, or meta commentary.',
  'Do not use markdown, bullets, stage directions, or narration labels.',
  'Identify whether the outcome is confirmed, rejected, busy, voicemail, or unresolved.',
  'If you reach voicemail, leave a brief message and stop.'
].join(' ');

const buildOpeningPrompt = (goal) => [
  'The recipient has answered the outbound call.',
  'Start naturally in one short opening turn.',
  `Immediately explain that you are calling about: ${goal}.`,
  'Your first line should sound like a real outbound call, not customer support.',
  'After stating the reason, ask only the next specific question needed to move that goal forward.',
  'Do not ask "How can I help you?" or wait for them to explain why you called.'
].join(' ');

const createVoiceProviderBridge = ({ session, goal }) => {
  return new GeminiLiveBridge({ session, goal });
};

class GeminiLiveBridge {
  constructor({ session, goal }) {
    this.session = session;
    this.goal = goal;
    this.socket = null;
    this.isReady = false;
    this.pendingAudioMessages = [];
    this.setupPromise = null;
    this.resolveSetup = null;
    this.rejectSetup = null;
    this.outputAudioRemainder = new Int16Array(0);
    this.outputAudioSampleRate = 24000;
  }

  flushPendingAudioMessages() {
    while (this.pendingAudioMessages.length > 0) {
      this.send(this.pendingAudioMessages.shift());
    }
  }

  sendRealtimeText(text) {
    this.send({
      realtimeInput: {
        text
      }
    });
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

    this.setupPromise = new Promise((resolve, reject) => {
      this.resolveSetup = resolve;
      this.rejectSetup = reject;
    });

    this.socket.on('message', (data) => {
      void this.handleServerMessage(data.toString());
    });

    this.socket.on('error', (error) => {
      if (!this.isReady) {
        this.rejectSetup?.(error);
      }
      void this.session.recordProviderError(error.message);
    });

    this.socket.on('close', () => {
      if (!this.isReady) {
        this.rejectSetup?.(new Error('Gemini Live socket closed before setup completed.'));
      }
    });

    this.send({
      setup: {
        model: normalizeGeminiModelName(GEMINI_LIVE_MODEL),
        generationConfig: {
          responseModalities: ['AUDIO'],
          ...buildGeminiThinkingConfig(GEMINI_LIVE_MODEL),
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: GEMINI_PREBUILT_VOICE
              }
            }
          }
        },
        systemInstruction: {
          parts: [
            {
              text: buildVoiceInstructions(this.goal)
            }
          ]
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    });

    await Promise.race([
      this.setupPromise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Gemini Live setup timed out after ${GEMINI_SETUP_TIMEOUT_MS}ms.`));
        }, GEMINI_SETUP_TIMEOUT_MS);
      })
    ]);
    await this.session.recordProviderEvent('gemini-connected', {
      model: normalizeGeminiModelName(GEMINI_LIVE_MODEL),
      voice: GEMINI_PREBUILT_VOICE
    });

    this.sendRealtimeText(buildOpeningPrompt(this.goal));

    this.flushPendingAudioMessages();
  }

  appendIncomingAudio(base64Payload) {
    const pcm16Base64 = mulaw8kToPcm16kBase64(base64Payload);
    const audioMessage = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: pcm16Base64
        }
      }
    };

    if (!this.isReady) {
      this.pendingAudioMessages.push(audioMessage);
      this.pendingAudioMessages = this.pendingAudioMessages.slice(-50);
      return;
    }

    this.send(audioMessage);
  }

  async handleServerMessage(rawMessage) {
    const event = safeJsonParse(rawMessage, {});

    if (event.setupComplete !== undefined) {
      this.isReady = true;
      this.resolveSetup?.();
      this.resolveSetup = null;
      this.rejectSetup = null;

      await this.session.recordProviderEvent('gemini-setup-complete');
    }

    if (event.goAway) {
      await this.session.recordProviderEvent('gemini-go-away', {
        timeLeft: event.goAway.timeLeft || ''
      });
    }

    if (event.serverContent?.interrupted) {
      this.session.clearTwilioAudio();
      await this.session.recordProviderEvent('gemini-interrupted');
    }

    if (event.serverContent?.inputTranscription?.text) {
      void this.session.addTranscriptEntry('Caller', event.serverContent.inputTranscription.text);
    }

    if (event.serverContent?.outputTranscription?.text) {
      void this.session.addTranscriptEntry('FrontDesk AI', event.serverContent.outputTranscription.text);
    }

    const parts = event.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const sourceSampleRate = getPcmSampleRateFromMimeType(part.inlineData.mimeType);
        const twilioAudioPayload = this.convertOutputAudioToTwilio(part.inlineData.data, sourceSampleRate);
        this.session.sendAudioToTwilio(twilioAudioPayload);
      }

      if (part.text && !event.serverContent?.outputTranscription?.text && !part.inlineData?.data) {
        void this.session.addTranscriptEntry('FrontDesk AI', part.text);
      }
    }
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  convertOutputAudioToTwilio(base64Payload, sourceSampleRate) {
    if (sourceSampleRate !== this.outputAudioSampleRate) {
      this.outputAudioRemainder = new Int16Array(0);
      this.outputAudioSampleRate = sourceSampleRate;
    }

    const pcmSamples = bufferToInt16(Buffer.from(base64Payload, 'base64'));
    const { samples: pcm8k, remainder } = downsamplePcmTo8kWithRemainder(
      pcmSamples,
      sourceSampleRate,
      this.outputAudioRemainder
    );

    this.outputAudioRemainder = remainder;
    return encodeMulawBase64(pcm8k);
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;
const MULAW_SEG_END = [0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff, 0x1fff, 0x3fff, 0x7fff];

const findMulawSegment = (value) => {
  for (let index = 0; index < MULAW_SEG_END.length; index += 1) {
    if (value <= MULAW_SEG_END[index]) {
      return index;
    }
  }

  return MULAW_SEG_END.length;
};

const mulawToLinear = (value) => {
  const mulaw = (~value) & 0xff;
  const sign = mulaw & 0x80;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  return sign ? -sample : sample;
};

const linearToMulaw = (sample) => {
  const clippedSample = Math.max(-MULAW_CLIP, Math.min(MULAW_CLIP, sample));
  const magnitude = clippedSample < 0 ? MULAW_BIAS - clippedSample : clippedSample + MULAW_BIAS;
  const segment = findMulawSegment(magnitude);

  if (segment >= 8) {
    return (0x7f ^ (clippedSample < 0 ? 0x7f : 0xff)) & 0xff;
  }

  const mantissa = (magnitude >> (segment + 3)) & 0x0f;
  const encoded = (segment << 4) | mantissa;
  return (encoded ^ (clippedSample < 0 ? 0x7f : 0xff)) & 0xff;
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

const concatInt16Arrays = (first, second) => {
  if (!first?.length) {
    return second;
  }

  if (!second?.length) {
    return first;
  }

  const merged = new Int16Array(first.length + second.length);
  merged.set(first, 0);
  merged.set(second, first.length);
  return merged;
};

const getPcmSampleRateFromMimeType = (mimeType = '') => {
  const match = /rate=(\d+)/i.exec(mimeType) || /sample[-_]?rate=(\d+)/i.exec(mimeType);
  return Number(match?.[1] || 24000);
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

const downsamplePcmTo8kWithRemainder = (samples, fromRate, remainder = new Int16Array(0)) => {
  if (fromRate === 8000) {
    return { samples, remainder: new Int16Array(0) };
  }

  const merged = concatInt16Arrays(remainder, samples);
  const integerRatio = fromRate / 8000;

  if (Number.isInteger(integerRatio) && integerRatio > 1) {
    const usableLength = merged.length - (merged.length % integerRatio);
    const output = new Int16Array(usableLength / integerRatio);

    for (let outputIndex = 0; outputIndex < output.length; outputIndex += 1) {
      let total = 0;
      const baseIndex = outputIndex * integerRatio;

      for (let offset = 0; offset < integerRatio; offset += 1) {
        total += merged[baseIndex + offset];
      }

      output[outputIndex] = Math.round(total / integerRatio);
    }

    return {
      samples: output,
      remainder: merged.slice(usableLength)
    };
  }

  return {
    samples: resample(merged, fromRate, 8000),
    remainder: new Int16Array(0)
  };
};

const mulaw8kToPcm16kBase64 = (base64Payload) => {
  const pcm8k = decodeMulawBase64(base64Payload);
  const pcm16k = resample(pcm8k, 8000, 16000);
  return int16ToBuffer(pcm16k).toString('base64');
};

const pcmBase64ToMulaw8kBase64 = (base64Payload, fromRate = 24000) => {
  const pcmSamples = bufferToInt16(Buffer.from(base64Payload, 'base64'));
  const { samples: pcm8k } = downsamplePcmTo8kWithRemainder(pcmSamples, fromRate);
  return encodeMulawBase64(pcm8k);
};
