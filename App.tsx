import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import GraphCanvas from './components/GraphCanvas';
import NodeCard from './components/NodeCard';
import { NodeData, LinkData, NodeType, ExpertDefinition, DEFAULT_EXPERTS } from './types';
import { 
  gatekeeperTranslate, 
  generateSpecialistPrompt, 
  getExpertBrainstorm, 
  generateTopicContent, 
  generateConceptImage, 
  synthesizeRoadmap,
  generateDeepConnection
} from './services/geminiService';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectionMode, setConnectionMode] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // App State
  const [userRole, setUserRole] = useState('');
  const [availableExperts, setAvailableExperts] = useState<ExpertDefinition[]>(DEFAULT_EXPERTS);

  // Helper to add nodes safely
  const addNode = (node: NodeData) => {
    setNodes(prev => [...prev, node]);
  };

  // Helper to add links safely
  const addLink = (source: string, target: string) => {
    setLinks(prev => {
      const exists = prev.some(l => 
        ((l.source as NodeData).id === source || l.source === source) && 
        ((l.target as NodeData).id === target || l.target === target)
      );
      if (exists) return prev;
      return [...prev, { source, target }];
    });
  };

  // Update a node property (e.g. selection)
  const toggleNodeSelection = (nodeId: string) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, selectedForRoadmap: !n.selectedForRoadmap } : n
    ));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, selectedForRoadmap: !prev.selectedForRoadmap } : null);
    }
  };

  const handleReset = () => {
    setNodes([]);
    setLinks([]);
    setSelectedNode(null);
    setIsProcessing(false);
    setStatusMessage('Session reset.');
    setConnectionMode(false);
    setUserRole('');
    setAvailableExperts(DEFAULT_EXPERTS);
    setResetKey(prev => prev + 1);
  };

  // 1. Initial Gatekeeper Flow
  const handleStart = async (role: string, userInput: string) => {
    setUserRole(role);
    setIsProcessing(true);
    setStatusMessage('Gatekeeper is distilling core principle...');
    
    // Create User Node at origin (0,0) - D3 Center will handle this
    const userId = 'user-input';
    addNode({
      id: userId,
      type: NodeType.USER_INPUT,
      label: 'Core Topic',
      content: `${role}'s Topic: ${userInput}`,
      x: -100, y: 0 // Explicit start
    });

    try {
      const principle = await gatekeeperTranslate(role, userInput);
      const gatekeeperId = 'gatekeeper-1';
      
      addNode({
        id: gatekeeperId,
        type: NodeType.GATEKEEPER,
        label: 'Core Principle',
        content: principle,
        x: 100, y: 0 // Spawn to right of user input
      });

      addLink(userId, gatekeeperId);
      setStatusMessage('Principle extracted. Ready for experts.');
    } catch (error) {
      setStatusMessage('Error processing input.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2a. Generate Specialist
  const handleGenerateSpecialist = async (role: string) => {
    setIsProcessing(true);
    setStatusMessage(`Defining persona for ${role}...`);
    try {
      const systemPrompt = await generateSpecialistPrompt(role);
      const newExpert: ExpertDefinition = {
        id: `exp-${Date.now()}`,
        role: role,
        color: 'bg-indigo-600',
        systemPrompt: systemPrompt
      };
      setAvailableExperts(prev => [...prev, newExpert]);
      setStatusMessage(`${role} added to list.`);
    } catch (error) {
      setStatusMessage("Failed to generate specialist.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2b. Add Expert to Workspace
  const handleAddExpert = (expert: ExpertDefinition) => {
    const id = `expert-${Date.now()}`;
    // Spawn somewhat randomly around center to avoid stacking, but not too far
    addNode({
      id,
      type: NodeType.EXPERT,
      label: expert.role,
      content: expert.systemPrompt || `You are a ${expert.role}.`,
      role: expert.role,
      x: (Math.random() - 0.5) * 100, 
      y: (Math.random() - 0.5) * 100 + 150 // Spawn slightly below center
    });
    setStatusMessage(`${expert.role} spawned. Link to Gatekeeper to brainstorm.`);
    setConnectionMode(true);
  };

  // 3. Connect Flow
  const handleConnect = async (sourceId: string, targetId: string) => {
    addLink(sourceId, targetId);
    setConnectionMode(false); 

    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);
    if (!source || !target) return;

    let gatekeeper: NodeData | undefined;
    let expert: NodeData | undefined;

    if (source.type === NodeType.GATEKEEPER && target.type === NodeType.EXPERT) {
      gatekeeper = source;
      expert = target;
    } else if (target.type === NodeType.GATEKEEPER && source.type === NodeType.EXPERT) {
      gatekeeper = target;
      expert = source;
    }

    if (gatekeeper && expert) {
      setIsProcessing(true);
      setStatusMessage(`${expert.role} is searching for connections...`);
      
      try {
        const expertDef = availableExperts.find(e => e.role === expert!.role) || { systemPrompt: expert.content };
        
        // Step 1: Brainstorm
        const brainstorm = await getExpertBrainstorm(gatekeeper.content, expert.role || 'Expert', expertDef.systemPrompt || '');
        
        // Step 2: Generate nodes
        let count = 0;
        
        // Get fresh reference to Expert's position to spawn children nearby
        const currentExpertX = expert.x || 0;
        const currentExpertY = expert.y || 0;

        for (const topic of brainstorm.topics.slice(0, 3)) {
          count++;
          setStatusMessage(`${expert.role}: Expanding topic ${count}/3 ("${topic.title}")...`);
          
          const content = await generateTopicContent(topic.title, topic.context, expert.role || 'Expert');
          const imageBase64 = await generateConceptImage(content.imagePrompt);

          const conceptId = `concept-${Date.now()}-${count}`;
          
          // Spawn logic: Fan out below the expert
          addNode({
            id: conceptId,
            type: NodeType.CONCEPT,
            label: content.title,
            content: content.explanation,
            role: expert.role,
            image: imageBase64,
            selectedForRoadmap: false,
            isDeepDived: false,
            x: currentExpertX + (count * 100 - 200), // Fan out horizontally relative to expert
            y: currentExpertY + 150 // Below expert
          });

          addLink(gatekeeper.id, conceptId);
        }

        setStatusMessage(`${expert.role} added ${count} new perspectives.`);

      } catch (e) {
        setStatusMessage('Error during expert analysis.');
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 4. Deep Dive Flow
  const handleDeepDive = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const userNode = nodes.find(n => n.type === NodeType.USER_INPUT);
    
    if (!node || !userNode) return;

    setIsProcessing(true);
    setStatusMessage("Analyzing deep connection to your topic...");
    
    try {
        const deepAnalysis = await generateDeepConnection(
            userRole, 
            userNode.content, // "Role's Topic: Actual Topic"
            node.label,
            node.content,
            node.role || 'Expert'
        );

        // Update the node content by appending the deep dive
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                const updatedContent = n.content + "\n\n" + deepAnalysis;
                // If selectedNode is this one, update it too immediately
                if (selectedNode && selectedNode.id === nodeId) {
                  setSelectedNode({ ...n, content: updatedContent, isDeepDived: true });
                }
                return { ...n, content: updatedContent, isDeepDived: true };
            }
            return n;
        }));
        
        setStatusMessage("Deep analysis complete.");
    } catch (e) {
        setStatusMessage("Deep dive failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  // 5. Synthesis Flow
  const handleSynthesize = async () => {
    const principleNode = nodes.find(n => n.type === NodeType.GATEKEEPER);
    const selectedNodes = nodes.filter(n => n.selectedForRoadmap);
    
    if (!principleNode) {
      setStatusMessage("No Core Principle found.");
      return;
    }
    if (selectedNodes.length === 0) {
      setStatusMessage("Please select at least one concept node for the roadmap.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Synthesizing tailored Roadmap...');

    try {
      const nodesContent = selectedNodes.map(n => `[${n.role || 'Concept'}]: ${n.label} - ${n.content}`);
      const roadmapText = await synthesizeRoadmap(userRole, principleNode.content, nodesContent);
      
      const roadmapId = `roadmap-${Date.now()}`;
      addNode({
        id: roadmapId,
        type: NodeType.ROADMAP,
        label: 'Research Roadmap',
        content: roadmapText,
        x: 0, y: 300 // Spawn generally at bottom
      });

      selectedNodes.forEach(c => addLink(c.id, roadmapId));
      setStatusMessage('Roadmap generated.');

    } catch (e) {
      setStatusMessage('Error during synthesis.');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasGatekeeper = nodes.some(n => n.type === NodeType.GATEKEEPER);
  const hasExperts = nodes.some(n => n.type === NodeType.EXPERT);

  return (
    <div className="flex w-full h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar 
        onStart={handleStart}
        onAddExpert={handleAddExpert}
        onGenerateSpecialist={handleGenerateSpecialist}
        onSynthesize={handleSynthesize}
        onReset={handleReset}
        hasGatekeeper={hasGatekeeper}
        hasExperts={hasExperts}
        isProcessing={isProcessing}
        statusMessage={statusMessage}
        availableExperts={availableExperts}
      />
      
      <main className="flex-1 relative flex flex-col">
        <GraphCanvas 
          key={resetKey}
          nodes={nodes}
          links={links}
          onNodeClick={setSelectedNode}
          onConnect={handleConnect}
          connectionMode={connectionMode}
          setConnectionMode={setConnectionMode}
        />
      </main>

      {selectedNode && (
        <NodeCard 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)}
          onToggleSelection={toggleNodeSelection}
          onDeepDive={handleDeepDive}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default App;