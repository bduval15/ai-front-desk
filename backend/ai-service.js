import { getLlama, LlamaChatSession } from "node-llama-cpp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.join(__dirname, "models-storage", "mistral-7b-instruct-v0.2.Q4_K_M.gguf");

console.log("Initializing Llama Engine...");

const llama = await getLlama();

console.log("Loading Mistral-7B Model File...");

const model = await llama.loadModel({
    modelPath: modelPath
});

const context = await model.createContext();
const session = new LlamaChatSession({
    contextSequence: context.getSequence() 
});

let promptQueue = Promise.resolve();

const buildPrompt = (userPrompt, options) => {
    if (options.playground) {
        return `[INST] ${userPrompt} [/INST]`;
    }

    if (options.isFormattingMode) {
        return `[INST]
You are the transcript post-processor for a front desk AI system.
Clean the transcript, preserve meaning, remove filler words like um/uh, and extract the outcome.

Return only valid JSON with this exact structure:
{
  "callStatus": "Confirmed | Rejected | Busy | Voicemail | No Answer | Failed | Completed | Pending",
  "summary": "One sentence executive summary.",
  "formattedTranscript": "Speaker-labelled transcript with each turn on its own line.",
  "structuredData": {}
}

Rules:
- Do not include markdown fences.
- Keep the summary under 30 words.
- Use null or {} when data is unavailable.
- Do not invent details that are not present in the transcript.

Raw transcript:
${userPrompt}
[/INST]`;
    }

    return `System: You are a professional front desk assistant.
User Goal: ${userPrompt}
Task: Write a short opening script for a phone call.
Assistant Script:`;
};

const normalizeOptions = (optionsOrLegacyFlag) => {
    if (typeof optionsOrLegacyFlag === "boolean") {
        return { playground: optionsOrLegacyFlag, isFormattingMode: false };
    }

    return {
        playground: Boolean(optionsOrLegacyFlag?.playground),
        isFormattingMode: Boolean(optionsOrLegacyFlag?.isFormattingMode)
    };
};

export const generateMistralResponse = async (userPrompt, optionsOrLegacyFlag = false) => {
    const options = normalizeOptions(optionsOrLegacyFlag);
    const prompt = buildPrompt(userPrompt, options);
    const temperature = options.isFormattingMode ? 0.2 : 0.7;
    const maxTokens = options.isFormattingMode ? 700 : 500;

    const runPrompt = async () => {
        console.log("Mistral is thinking...");
        return session.prompt(prompt, {
            maxTokens,
            temperature
        });
    };

    const queuedPrompt = promptQueue.then(runPrompt);
    promptQueue = queuedPrompt.catch(() => undefined);
    return queuedPrompt;
};

console.log("Mistral-7B is Ready for Inference.");
