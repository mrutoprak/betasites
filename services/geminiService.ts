
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION, DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from "../constants";

export const generateMnemonicData = async (inputWord: string, modelId: string = DEFAULT_TEXT_MODEL) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `User Input: ${inputWord}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    
    // Expecting 4 lines now (Meaning, Arabic, Keyword, Story)
    if (lines.length < 4) {
      throw new Error("AI returned incomplete data format. Please try again.");
    }

    return {
      turkishMeaning: lines[0].trim(),
      arabicWord: lines[1].trim(),
      keyword: lines[2].trim(),
      story: lines[3].trim(),
      imagePrompt: "" // Prompt is no longer auto-generated
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // Extract error message string
    const errorMessage = error.message || error.toString();
    
    // Check for Quota/Rate Limit errors
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Daily AI quota exceeded. Please try again later or check your API plan.");
    }
    
    // Check for Server errors
    if (errorMessage.includes("503") || errorMessage.includes("500")) {
      throw new Error("AI service is temporarily unavailable. Please try again in a moment.");
    }

    // Generic error
    throw new Error(errorMessage || "Failed to generate content.");
  }
};

export const generateCreativePrompt = async (story: string, keyword: string, meaning: string, modelId: string = DEFAULT_TEXT_MODEL) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Create a detailed, realistic, and vivid English image generation prompt for the following Turkish mnemonic story. 
    The story links the meaning '${meaning}' to the keyword '${keyword}'.
    
    Story: "${story}"
    
    Output ONLY the English prompt. Do not add any conversational text.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Prompt Gen Error:", error);
    throw new Error("Failed to generate prompt.");
  }
};

export const generateImage = async (prompt: string, modelId: string = DEFAULT_IMAGE_MODEL) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    throw new Error("Failed to generate image. Please try again.");
  }
};
