# Synapse Discovery Engine v2 Implementation Plan

## Core Objectives
1.  **Role-Based Initialization:** Capture User Role + Core Topic.
2.  **Dynamic Expert Agents:** "Generate Specialist" creates new agents with custom system prompts.
3.  **Grounded Brainstorming:** Expert agents use Google Search to find 3 domain-specific analogies.
4.  **Visual Expansion:** Generated topics include Nano Banana images and link back to the Core Principle.
5.  **Curated Roadmap:** Users select specific nodes to generate a final report tailored to their role.

## Architecture Changes

### 1. Data Model (`types.ts`)
*   `ExpertDefinition`: Added `systemPrompt` to store the agent's persona.
*   `NodeData`: Added `selectedForRoadmap` boolean.

### 2. Services (`geminiService.ts`)
*   **`generateSpecialistPrompt`**: Uses Gemini to write a system prompt for a new role (e.g., "Chef").
*   **`getExpertBrainstorm`**:
    *   Input: Core Principle, Expert Role, System Prompt.
    *   Tool: `googleSearch`.
    *   Output: List of 3 distinct topics/analogies.
*   **`generateTopicContent`**:
    *   Input: Topic Headline + Context.
    *   Output: Title, Explanation, Image Prompt.
*   **`generateConceptImage`**: Uses `gemini-2.5-flash-image`.

### 3. Application Flow (`App.tsx`)
*   **Start**: User inputs Role (e.g., "Student") and Topic (e.g., "Black Holes").
*   **Gatekeeper**: Distills Topic -> Principle.
*   **Connect**: Drag Gatekeeper -> Expert.
    *   Expert searches web -> Finds 3 topics.
    *   System generates content + images for all 3.
    *   Nodes appear linked to Gatekeeper.
*   **Roadmap**: User toggles "Select for Roadmap" on nodes -> Clicks "Generate Roadmap".

## User Interface
*   **Sidebar**: Updated to support User Role input and dynamic expert list.
*   **NodeCard**: Added selection toggle for roadmap synthesis.
