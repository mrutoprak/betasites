
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION, MEDICAL_SYSTEM_INSTRUCTION, DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from "../constants";

export const generateMnemonicData = async (inputWord: string, mode: 'turkish_to_arabic' | 'arabic_to_turkish' | 'medical', modelId: string = DEFAULT_TEXT_MODEL) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let finalInstruction = "";

  if (mode === 'medical') {
    // Medical mode uses its own system instruction
    finalInstruction = MEDICAL_SYSTEM_INSTRUCTION;
  } else {
    // Arabic mode with sub-modes
    let modeInstruction = "";
    if (mode === 'turkish_to_arabic') {
        modeInstruction = `
        STRICT MODE: TURKISH TO ARABIC.
        The user input is a TURKISH word/phrase.
        1. Translate this Turkish word into the most appropriate Arabic (Fusha/MSA) word.
        2. Then generate the mnemonic based on that Arabic word's pronunciation.
        `;
    } else {
        modeInstruction = `
        STRICT MODE: ARABIC TO TURKISH.
        The user input is an ARABIC word (script or transliteration).
        1. Identify the Turkish meaning of this Arabic word.
        2. Generate the mnemonic based on the Arabic word's pronunciation.
        `;
    }
    finalInstruction = `${SYSTEM_INSTRUCTION}\n\n${modeInstruction}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `User Input: ${inputWord}`,
      config: {
        systemInstruction: finalInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    
    // Expecting 4 lines (Line1, Line2, Keyword, Story)
    if (lines.length < 4) {
      throw new Error("AI returned incomplete data format. Please try again.");
    }

    if (mode === 'medical') {
      // Medical: Line1=Term, Line2=Explanation, Line3=Keyword, Line4=Story
      return {
        turkishMeaning: lines[1].trim(),  // Explanation as meaning
        arabicWord: lines[0].trim(),       // Medical term stored in arabicWord field
        keyword: lines[2].trim(),
        story: lines[3].trim(),
        imagePrompt: ""
      };
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

export const regenerateStory = async (meaning: string, arabicWord: string, currentKeyword: string, currentStory: string, modelId: string = DEFAULT_TEXT_MODEL) => {
  if (!process.env.API_KEY) {
      throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
  Regenerate the Mnemonic Story for this Arabic word.
  
  Meaning: ${meaning}
  Arabic Word: ${arabicWord}
  Previous Keyword: ${currentKeyword}
  Previous Story: ${currentStory}

  INSTRUCTIONS:
  1. Find a DIFFERENT Turkish Sound-Alike Keyword (if possible) OR use the same keyword with a DIFFERENT, more vivid story.
  2. The keyword must be a real Turkish noun.
  3. The story must link the Meaning and the Keyword in a funny or absurd way.

  OUTPUT FORMAT (Strictly 2 lines):
  [NEW KEYWORD]
  [NEW STORY]
  `;

  try {
      const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
              temperature: 0.9, // Higher creativity for regeneration
          },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("No response");

      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) throw new Error("Invalid format");

      return {
          keyword: lines[0].trim(),
          story: lines[1].trim()
      };
  } catch (error) {
      console.error("Regenerate Story Error:", error);
      throw new Error("Failed to regenerate story.");
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
