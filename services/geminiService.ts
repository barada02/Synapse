import { GoogleGenAI, Type } from "@google/genai";
import { BrainstormResult, TopicContentResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Gatekeeper Agent: Translates Core Topic into a Core Principle.
 */
export const gatekeeperTranslate = async (userRole: string, userInput: string): Promise<string> => {
  if (!userInput) return "No input provided.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User Role: ${userRole}\nUser's Core Topic: "${userInput}"`,
      config: {
        systemInstruction: "You are the Gatekeeper Agent. Abstract the user's topic into a single, fundamental scientific or mathematical principle (The Core Principle). Keep it concise (1-2 sentences).",
      }
    });
    
    return response.text || "Could not extract principle.";
  } catch (error) {
    console.error("Gatekeeper error:", error);
    throw error;
  }
};

/**
 * Specialist Generator: Creates a system prompt for a new expert role.
 */
export const generateSpecialistPrompt = async (role: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a system prompt for an AI agent acting as a "${role}". The prompt should instruct the agent to use their domain knowledge to find analogies for scientific principles.`,
      config: {
        systemInstruction: "You are an AI Architect. Output ONLY the system prompt text.",
      }
    });
    return response.text || `You are a ${role}. Use your domain knowledge to find connections.`;
  } catch (error) {
    return `You are a ${role}. Use your domain knowledge to find connections.`;
  }
};

/**
 * Expert Agent (Brainstorming): Uses Search to find 3 related topics.
 * Note: Uses gemini-2.5-flash for best tool support and speed.
 */
export const getExpertBrainstorm = async (principle: string, role: string, systemPrompt: string): Promise<BrainstormResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The Core Principle is: "${principle}".
      
      TASK: Using Google Search, find 3 distinct, specific concepts, phenomena, or historical events in the field of "${role}" that align with or illustrate this principle.
      
      OUTPUT FORMAT: Return ONLY a raw JSON object (no markdown formatting) with a "topics" array. Each item must have a "title" and a brief "context".
      Example: { "topics": [{ "title": "Example Concept", "context": "Brief explanation..." }] }`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: `${systemPrompt} You are a research agent. You must ground your analogies in real world facts using Google Search.`,
        // Note: responseMimeType and responseSchema are NOT supported when using googleSearch tool
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from Expert Agent");
    
    // Clean up markdown code blocks if present to ensure JSON parse works
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Log grounding chunks if available
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      console.log("Grounding Chunks:", response.candidates[0].groundingMetadata.groundingChunks);
    }

    return JSON.parse(text) as BrainstormResult;
  } catch (error) {
    console.error(`Expert ${role} error:`, error);
    // Fallback if search/json fails - return meaningful error content so UI doesn't look broken
    return { 
      topics: [
        { title: `Analysis Failed`, context: `Could not retrieve external data for ${role}. The API key may not have permissions for Search Grounding.` }
      ] 
    };
  }
};

/**
 * Content Agent: Generates full node content and image prompt for a specific topic.
 */
export const generateTopicContent = async (topicTitle: string, topicContext: string, expertRole: string): Promise<TopicContentResult> => {
   try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Topic: ${topicTitle}\nContext: ${topicContext}`,
      config: {
        systemInstruction: `You are a Content Generator for a ${expertRole}. 
        Write a concise title, a clear 2-3 sentence explanation connecting this topic to the underlying principle, and a highly visual image prompt for an image generator (no text in image).
        Return JSON.`,
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
    if (!text) throw new Error("No content generated");
    return JSON.parse(text) as TopicContentResult;
   } catch (error) {
     console.error("Content gen error:", error);
     throw error;
   }
};

/**
 * Image Generator: Uses Nano Banana (gemini-2.5-flash-image).
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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation error:", error);
    return undefined; 
  }
};

/**
 * Synthesis Agent: Creates a roadmap report.
 */
export const synthesizeRoadmap = async (userRole: string, principle: string, selectedNodesContent: string[]): Promise<string> => {
  try {
    const nodesText = selectedNodesContent.join('\n\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `User Role: ${userRole}
      Core Principle: ${principle}
      
      Selected Concepts:
      ${nodesText}
      
      Create a structured, actionable Learning/Research Roadmap for the User based on these selected concepts.`,
      config: {
        systemInstruction: "You are the Synthesis Agent. Output clean Markdown with sections: 'Objective', 'Key Connections', 'Exploration Path', 'Practical Application'.",
      }
    });

    return response.text || "Could not synthesize roadmap.";
  } catch (error) {
    console.error("Synthesis error:", error);
    throw error;
  }
};

/**
 * Deep Dive Agent: Explains the connection between the Concept and the User's Original Topic.
 */
export const generateDeepConnection = async (
  userRole: string,
  userTopicInfo: string,
  conceptTitle: string,
  conceptContent: string,
  expertRole: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use a stronger model for reasoning
      contents: `
      User Input Context: ${userTopicInfo}
      User Role: ${userRole}
      
      Expert Role: ${expertRole}
      Expert Concept: "${conceptTitle}"
      Concept Description: "${conceptContent}"
      
      TASK: Write a detailed "Deep Dive" analysis (approx. 200 words) that explicitly explains structurally and functionally how this Expert Concept serves as a strong analogy or solution for the User's Original Topic. 
      Focus on the MECHANISM of the connection. Why does this matter to the user?
      
      Output in Markdown. Use a header "### ⚡ Deep Dive: The Cross-Disciplinary Link".`,
    });

    return response.text || "Could not generate deep dive analysis.";
  } catch (error) {
    console.error("Deep Dive error:", error);
    return "Error generating analysis.";
  }
};