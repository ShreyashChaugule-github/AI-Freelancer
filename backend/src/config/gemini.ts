import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables. Gemini calls will fail.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

// Helper to get models
export const getGeminiProModel = () => {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-pro", // Fallback to 1.5 Pro if 2.5 Pro is not globally available in SDK v0.11
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });
};

export const getGeminiTextModel = () => {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.7,
    },
  });
};
