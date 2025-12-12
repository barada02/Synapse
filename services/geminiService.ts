import { GoogleGenAI, Type } from "@google/genai";
import { AnalogyResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Gatekeeper Agent: Translates complex input into a core scientific principle.
 */
export const gatekeeperTranslate = async (userInput: string): Promise<string> => {
  if (!userInput) return "No input provided.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are the Gatekeeper Agent for the Synapse Discovery Engine. 
      Your task is to abstract the following complex user input (which may be a hypothesis, observation, or question) into a single, fundamental, universal scientific or mathematical principle. 
      Keep it concise (1-2 sentences). 
      
      User Input: "${userInput}"`,
      config: {
        systemInstruction: "You are a scientific abstractor. Ignore fluff, find the core mechanism.",
      }
    });
    
    return response.text || "Could not extract principle.";
  } catch (error) {
    console.error("Gatekeeper error:", error);
    throw error;
  }
};

/**
 * Expert Agent: Generates an analogy and an image prompt based on the principle.
 */
export const generateExpertAnalogy = async (principle: string, expertRole: string): Promise<AnalogyResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The core principle is: "${principle}".`,
      config: {
        systemInstruction: `You are a highly specialized ${expertRole} Expert Agent.
        Your task is to take the provided fundamental scientific principle and translate it into a novel, non-obvious analogy or research idea specific to your field (${expertRole}).
        
        Output valid JSON with the following structure:
        {
          "title": "Short catchy title for the analogy",
          "explanation": "2-3 sentences explaining the connection.",
          "imagePrompt": "A highly specific, visual description of this analogy for an image generator. Do not include text in the image description."
        }`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            explanation: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["title", "explanation", "imagePrompt"],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Expert Agent");
    
    return JSON.parse(text) as AnalogyResult;
  } catch (error) {
    console.error(`Expert ${expertRole} error:`, error);
    throw error;
  }
};

/**
 * Generates an image based on a prompt using Gemini.
 */
export const generateConceptImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // Nano banana models do not support responseMimeType or schema
      }
    });

    // Iterate to find the image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation error:", error);
    return undefined; // Fail gracefully for images
  }
};

/**
 * Synthesis Agent: Creates a roadmap from multiple analogies.
 */
export const synthesizeRoadmap = async (principle: string, analogies: {role: string, content: string}[]): Promise<string> => {
  try {
    const analogiesText = analogies.map(a => `- ${a.role}: ${a.content}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use a stronger model for synthesis
      contents: `Core Principle: ${principle}
      
      Cross-Field Analogies:
      ${analogiesText}
      
      Create a structured, actionable Research Roadmap that fuses these concepts.`,
      config: {
        systemInstruction: "You are the Synthesis Agent. Output Markdown formatted text with headings for 'Research Objective', 'Methodology', and 'Potential Impact'.",
      }
    });

    return response.text || "Could not synthesize roadmap.";
  } catch (error) {
    console.error("Synthesis error:", error);
    throw error;
  }
};