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

export const generateMistralResponse = async (goal) => {
    const prompt = `System: You are a professional front desk assistant. 
    User Goal: ${goal}
    Task: Write a short, 2-sentence opening script for a phone call to achieve this goal. 
    Assistant Script:`;

    console.log("Mistral is thinking...");

    const response = await session.prompt(prompt);
    return response;
};

console.log("Mistral-7B is Ready for Inference.");