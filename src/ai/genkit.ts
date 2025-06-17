import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// Ensure GOOGLE_API_KEY is set in your environment for this to work.
// You can configure this in your .env.local file.
export const ai = genkit({
  plugins: [googleAI()],
  model: "googleai/gemini-2.0-flash", // Default model
  // You can set other default configurations here, e.g., temperature
  // defaultModelConfig: { temperature: 0.7 },
});
