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

## Phase 4: Canvas Usability Improvements (New)
*   **Problem**: Nodes float off-screen due to repulsion forces, and the user cannot retrieve them because the canvas is static.
*   **Solution**:
    1.  **Pan & Zoom**: Implement `d3.zoom` on the SVG canvas. This allows the user to drag the background to pan and scroll to zoom, making the workspace effectively infinite.
    2.  **Smart Spawning**: Update `App.tsx` to spawn new nodes (Experts/Concepts) *relative* to their parent/source node's position (e.g., `parent.x + 50`), rather than random coordinates. This keeps clusters together initially.
    3.  **Physics Tweak**: Increase `d3.forceManyBody` damping or add a weak centering force to prevent nodes from drifting too far endlessly.
    4.  **View Controls**: Add a "Recenter / Fit View" button to the UI that automatically scales and translates the graph to fit all nodes within the visible viewport.

## User Interface
*   **Sidebar**: Updated to support User Role input and dynamic expert list.
*   **NodeCard**: Added selection toggle for roadmap synthesis.
*   **Canvas Controls**: Add Zoom In, Zoom Out, and Fit to Screen buttons.
