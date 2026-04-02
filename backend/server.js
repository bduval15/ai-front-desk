import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createServer } from 'http';

import { generateMistralResponse } from './ai-service.js';
import User from './models/User.js';
import Call from './models/Call.js';
import { CALL_LIMIT, getUsageWarning, protect } from './middleware/auth.js';
import {
    buildCallTwiml,
    handleCallStatusUpdate,
    initiateOutboundCall,
    isTerminalCallStatus,
    registerVoiceSocketServer,
    resolvePublicBaseUrl
} from './services/voice-service.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

const JWT_SECRET = process.env.JWT_SECRET;
const transcriptProcessingJobs = new Set();
const normalizeOrigin = (origin = '') => origin.replace(/\/+$/, '');
const configuredOrigins = new Set(
    [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
        ...(process.env.ALLOWED_ORIGINS || '').split(',')
    ]
        .map((origin) => normalizeOrigin(origin || ''))
        .filter(Boolean)
);

const isNgrokOrigin = (origin = '') => /^https:\/\/[a-z0-9-]+\.(ngrok-free\.app|ngrok\.io|ngrok\.app)$/i.test(origin);

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (configuredOrigins.has(normalizedOrigin) || isNgrokOrigin(normalizedOrigin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true
};

app.use(cors(corsOptions));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.error("DB Connection Error:", err));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const normalizeCallStatus = (rawStatus, fallback = 'Completed') => {
    const normalized = (rawStatus || '').trim().toLowerCase();
    const mapping = {
        confirmed: 'Confirmed',
        rejected: 'Rejected',
        busy: 'Busy',
        voicemail: 'Voicemail',
        'no answer': 'No Answer',
        'no-answer': 'No Answer',
        failed: 'Failed',
        completed: 'Completed',
        pending: 'Pending',
        canceled: 'Canceled',
        'in progress': 'In Progress'
    };

    return mapping[normalized] || rawStatus || fallback;
};

const extractFirstJsonObject = (rawText = '') => {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
        return null;
    }

    try {
        return JSON.parse(rawText.slice(start, end + 1));
    } catch (error) {
        return null;
    }
};

const buildFallbackSummary = (call) => {
    const status = normalizeCallStatus(call.callStatus, 'Completed');

    switch (status) {
        case 'Voicemail':
            return `Reached voicemail for ${call.phoneNumber} and left a message.`;
        case 'Busy':
            return `${call.phoneNumber} was busy and the conversation could not continue.`;
        case 'No Answer':
            return `${call.phoneNumber} did not answer the call.`;
        case 'Failed':
            return `The outbound call to ${call.phoneNumber} failed before the conversation started.`;
        default:
            return `Call with ${call.phoneNumber} finished with status ${status}.`;
    }
};

const normalizeWhitespace = (value = '') => value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

const sentenceCase = (value = '') => {
    const normalized = normalizeWhitespace(value);

    if (!normalized) {
        return '';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeSpeakerLabel = (speaker = '') => {
    const normalized = speaker.trim().toLowerCase();

    if (/(front\s*desk|frontdesk|assistant|agent)/.test(normalized)) {
        return 'FrontDesk AI';
    }

    if (/(caller|customer|recipient|human|person|user)/.test(normalized)) {
        return 'Caller';
    }

    return speaker.trim() || 'Transcript';
};

const parseTranscriptLines = (transcript = '') => transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);

        if (!match) {
            return {
                speaker: 'Transcript',
                message: sentenceCase(line)
            };
        }

        return {
            speaker: normalizeSpeakerLabel(match[1]),
            message: sentenceCase(match[2])
        };
    })
    .filter((entry) => entry.message);

const isDuplicateTranscriptEntry = (previousEntry, nextEntry) => {
    if (!previousEntry || !nextEntry) {
        return false;
    }

    return (
        previousEntry.speaker === nextEntry.speaker &&
        previousEntry.message.toLowerCase() === nextEntry.message.toLowerCase()
    );
};

const shouldDropTrailingTranscriptArtifact = (entries = []) => {
    if (entries.length < 2) {
        return false;
    }

    const previousEntry = entries[entries.length - 2];
    const lastEntry = entries[entries.length - 1];

    if (previousEntry.speaker !== 'FrontDesk AI' || lastEntry.speaker !== 'Caller') {
        return false;
    }

    const previousText = previousEntry.message.toLowerCase();
    const lastText = lastEntry.message.toLowerCase();

    const hasFarewell = /(have a good day|have a great day|goodbye|bye|take care|talk soon|all set then|thanks, that'?s all set)/i.test(previousText);
    const isShortTail = /^(hi|bye|okay|ok|thanks|thank you|yeah|yep|alright)\.?$/i.test(lastText);

    return hasFarewell && isShortTail;
};

const sanitizeFormattedTranscript = (transcript = '', call) => {
    const fallbackTranscript = transcript || call.rawTranscript || call.transcript || '';
    const entries = parseTranscriptLines(fallbackTranscript);

    const dedupedEntries = entries.filter((entry, index) => !isDuplicateTranscriptEntry(entries[index - 1], entry));

    if (shouldDropTrailingTranscriptArtifact(dedupedEntries)) {
        dedupedEntries.pop();
    }

    return dedupedEntries
        .map((entry) => `${entry.speaker}: ${entry.message}`)
        .join('\n')
        .trim();
};

const sanitizeSummary = (summary = '', call) => {
    const nextSummary = sentenceCase(summary || buildFallbackSummary(call))
        .replace(/\bCaller\b/g, 'the caller')
        .replace(/\bRecipient\b/g, 'the caller');

    return nextSummary.replace(/^The the caller\b/, 'The caller');
};

const parseFormattedTranscriptPayload = (rawModelOutput, call) => {
    const parsed = extractFirstJsonObject(rawModelOutput);

    if (!parsed) {
        return {
            formattedTranscript: sanitizeFormattedTranscript(call.rawTranscript, call),
            summary: sanitizeSummary(buildFallbackSummary(call), call),
            callStatus: normalizeCallStatus(call.callStatus),
            structuredData: {}
        };
    }

    return {
        formattedTranscript: sanitizeFormattedTranscript(parsed.formattedTranscript?.trim() || call.rawTranscript, call),
        summary: sanitizeSummary(parsed.summary?.trim() || buildFallbackSummary(call), call),
        callStatus: normalizeCallStatus(parsed.callStatus, call.callStatus),
        structuredData: parsed.structuredData && typeof parsed.structuredData === 'object'
            ? parsed.structuredData
            : {}
    };
};

const queueTranscriptFormatting = (callId) => {
    if (transcriptProcessingJobs.has(callId)) {
        return;
    }

    transcriptProcessingJobs.add(callId);

    setImmediate(async () => {
        try {
            const call = await Call.findById(callId);

            if (!call) {
                return;
            }

            call.transcriptProcessingStatus = 'processing';
            call.processingError = '';
            await call.save();

            if (!call.rawTranscript?.trim()) {
                call.summary = call.summary || buildFallbackSummary(call);
                call.formattedTranscript = call.formattedTranscript || '';
                call.transcript = call.formattedTranscript || call.rawTranscript || '';
                call.transcriptProcessingStatus = 'completed';
                await call.save();
                return;
            }

            const modelOutput = await generateMistralResponse(call.rawTranscript, { isFormattingMode: true });
            const formatted = parseFormattedTranscriptPayload(modelOutput, call);

            call.formattedTranscript = formatted.formattedTranscript;
            call.summary = formatted.summary;
            call.callStatus = formatted.callStatus;
            call.structuredData = formatted.structuredData;
            call.transcript = formatted.formattedTranscript || call.rawTranscript;
            call.transcriptProcessingStatus = 'completed';
            call.processingError = '';
            await call.save();
        } catch (error) {
            console.error('Transcript processing failed:', error);
            await Call.findByIdAndUpdate(callId, {
                transcriptProcessingStatus: 'failed',
                processingError: error.message || 'Transcript processing failed'
            });
        } finally {
            transcriptProcessingJobs.delete(callId);
        }
    });
};

const onCallEnded = async (callId, metadata = {}) => {
    const call = await Call.findById(callId);

    if (!call) {
        return;
    }

    if (metadata.rawTranscript?.trim()) {
        call.rawTranscript = metadata.rawTranscript;
        call.transcript = metadata.rawTranscript;
    }

    if (metadata.callStatus) {
        call.callStatus = normalizeCallStatus(metadata.callStatus, call.callStatus);
    }

    if (metadata.answeredBy) {
        call.answeredBy = metadata.answeredBy;
    }

    if (metadata.stopReason) {
        call.rawTelephonyData = {
            ...(call.rawTelephonyData || {}),
            stopReason: metadata.stopReason
        };
    }

    if (!isTerminalCallStatus(call.callStatus) && metadata.stopReason) {
        call.callStatus = 'Completed';
    }

    await call.save();
    queueTranscriptFormatting(callId);
};

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        voiceProvider: (process.env.VOICE_AI_PROVIDER || 'openai').toLowerCase(),
        publicBaseUrlConfigured: Boolean(resolvePublicBaseUrl(req)),
        allowedOrigins: Array.from(configuredOrigins)
    });
});

app.post('/api/ai/test', async (req, res) => {
    const { prompt } = req.body;

    try {
        const aiOutput = await generateMistralResponse(prompt, true);
        res.json({ output: aiOutput });
    } catch (error) {
        res.status(500).json({ error: "Mistral failed to respond." });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
            role: 'user',
            apiCalls: 0
        });

        await newUser.save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            success: true,
            token,
            user: {
                email: user.email,
                role: user.role,
                apiCalls: user.apiCalls,
                warning: getUsageWarning(user.apiCalls)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.json({ success: true, message: "Check your email." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        await transporter.sendMail({
            from: `"FrontDesk AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `<p>Your reset link (expires in 1hr): <a href="${resetUrl}">${resetUrl}</a></p>`
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const resetToken = req.params.token;

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Token is invalid or has expired." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.passwordHash = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        res.json({ success: true, message: "Password has been successfully reset." });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/api/telephony/make-call', protect, async (req, res) => {
    const phoneNumber = `${req.body.phoneNumber || ''}`.trim();
    const goal = `${req.body.goal || ''}`.trim();

    if (!phoneNumber || !goal) {
        return res.status(400).json({
            success: false,
            error: 'Phone number and goal are required.',
            warning: getUsageWarning(req.user.apiCalls)
        });
    }

    if (!/^\+?[0-9()\-\s]{7,}$/.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            error: 'Please enter a valid phone number.',
            warning: getUsageWarning(req.user.apiCalls)
        });
    }

    try {
        const user = await User.findById(req.user.id);

        if (user.apiCalls >= CALL_LIMIT) {
            return res.status(403).json({
                success: false,
                error: "Call limit reached. Please upgrade your plan or contact support.",
                warning: getUsageWarning(user.apiCalls),
                apiCalls: user.apiCalls,
                remainingCalls: 0
            });
        }

        const call = new Call({
            userId: user._id,
            userEmail: user.email,
            phoneNumber,
            goal,
            callStatus: 'Queued',
            transcriptProcessingStatus: 'pending',
            provider: (process.env.VOICE_AI_PROVIDER || 'openai').toLowerCase(),
            rawTelephonyData: {
                request: {
                    at: new Date().toISOString(),
                    goal,
                    phoneNumber
                }
            }
        });

        await call.save();

        try {
            const outbound = await initiateOutboundCall({
                callId: call._id.toString(),
                phoneNumber,
                goal,
                baseUrl: resolvePublicBaseUrl(req)
            });

            call.providerCallSid = outbound.providerCallSid;
            call.callStatus = outbound.callStatus;
            call.rawTelephonyData = {
                ...(call.rawTelephonyData || {}),
                twilioCreateResponse: outbound.rawResponse
            };
            await call.save();

            user.apiCalls += 1;
            await user.save();

            const warning = getUsageWarning(user.apiCalls);

            return res.status(202).json({
                success: true,
                message: 'Outbound call queued.',
                call,
                apiCalls: user.apiCalls,
                remainingCalls: Math.max(0, CALL_LIMIT - user.apiCalls),
                warning
            });
        } catch (error) {
            call.callStatus = 'Failed';
            call.processingError = error.message || 'Unable to start outbound call.';
            call.summary = buildFallbackSummary(call);
            call.transcriptProcessingStatus = 'completed';
            await call.save();

            return res.status(503).json({
                success: false,
                error: error.message || 'AI Dispatch Failed',
                warning: getUsageWarning(user.apiCalls),
                apiCalls: user.apiCalls,
                remainingCalls: Math.max(0, CALL_LIMIT - user.apiCalls)
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'AI Dispatch Failed',
            warning: getUsageWarning(req.user.apiCalls)
        });
    }
});

app.post('/api/telephony/status/:callId', async (req, res) => {
    try {
        const outcome = await handleCallStatusUpdate({
            callId: req.params.callId,
            payload: req.body,
            onCallEnded
        });

        res.json({ success: true, ...outcome });
    } catch (error) {
        console.error('Twilio status callback failed:', error);
        res.status(500).json({ success: false });
    }
});

app.all('/api/telephony/twiml/:callId', async (req, res) => {
    try {
        const call = await Call.findById(req.params.callId);

        if (!call) {
            return res.status(404).type('text/xml').send('<Response><Hangup /></Response>');
        }

        const baseUrl = resolvePublicBaseUrl(req);

        if (!baseUrl) {
            return res.status(500).type('text/xml').send('<Response><Say>Configuration error.</Say><Hangup /></Response>');
        }

        res.type('text/xml').send(buildCallTwiml({
            baseUrl,
            callId: call._id.toString(),
            goal: call.goal
        }));
    } catch (error) {
        console.error('Failed to generate TwiML:', error);
        res.status(500).type('text/xml').send('<Response><Hangup /></Response>');
    }
});

app.get('/api/admin/users', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Denied" });
    }

    const users = await User.find({}, 'email role apiCalls createdAt _id');
    res.json(users);
});

app.get('/api/admin/all-calls', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Denied" });
    }

    const calls = await Call.find().sort({ createdAt: -1 });
    res.json(calls);
});

app.get('/api/calls/my-calls', protect, async (req, res) => {
    const calls = await Call.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(calls);
});

const PORT = 5000;
const server = createServer(app);
registerVoiceSocketServer({ server, onCallEnded });

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
