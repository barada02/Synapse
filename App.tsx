import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import GraphCanvas from './components/GraphCanvas';
import NodeCard from './components/NodeCard';
import { NodeData, LinkData, NodeType } from './types';
import { gatekeeperTranslate, generateExpertAnalogy, generateConceptImage, synthesizeRoadmap } from './services/geminiService';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectionMode, setConnectionMode] = useState(false);

  // Helper to add nodes safely
  const addNode = (node: NodeData) => {
    setNodes(prev => [...prev, node]);
  };

  // Helper to add links safely
  const addLink = (source: string, target: string) => {
    // Avoid duplicates
    setLinks(prev => {
      if (prev.find(l => (l.source === source || (l.source as NodeData).id === source) && (l.target === target || (l.target as NodeData).id === target))) {
        return prev;
      }
      return [...prev, { source, target }];
    });
  };

  // 1. Initial Gatekeeper Flow
  const handleStart = async (userInput: string) => {
    setIsProcessing(true);
    setStatusMessage('Gatekeeper is analyzing input...');
    
    // Create User Node
    const userId = 'user-input';
    addNode({
      id: userId,
      type: NodeType.USER_INPUT,
      label: 'Hypothesis',
      content: userInput,
      x: 0, y: 0 // Will be positioned by force graph
    });

    try {
      const principle = await gatekeeperTranslate(userInput);
      const gatekeeperId = 'gatekeeper-1';
      
      addNode({
        id: gatekeeperId,
        type: NodeType.GATEKEEPER,
        label: 'Core Principle',
        content: principle,
        x: 100, y: 0
      });

      addLink(userId, gatekeeperId);
      setStatusMessage('Principle extracted. Ready for experts.');
    } catch (error) {
      setStatusMessage('Error processing input.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Add Expert Flow
  const handleAddExpert = (role: string) => {
    const id = `expert-${Date.now()}`;
    addNode({
      id,
      type: NodeType.EXPERT,
      label: role,
      content: `Specialized ${role} agent waiting for context connection.`,
      role: role,
      x: Math.random() * 200, y: Math.random() * 200
    });
    setStatusMessage(`${role} added. Connect to Principle to activate.`);
    
    // Auto-enter connection mode for better UX
    setConnectionMode(true);
  };

  // 3. Connect Flow (Triggering Expert Analysis)
  const handleConnect = async (sourceId: string, targetId: string) => {
    addLink(sourceId, targetId);
    setConnectionMode(false); // Exit mode

    // Check if we connected Gatekeeper -> Expert
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);

    if (!source || !target) return;

    // Logic: If connecting a Principle (Source) to an empty Expert (Target)
    if (source.type === NodeType.GATEKEEPER && target.type === NodeType.EXPERT) {
      setIsProcessing(true);
      setStatusMessage(`${target.role} is generating analogies...`);
      
      try {
        const result = await generateExpertAnalogy(source.content, target.role || 'Expert');
        
        // Update Expert Node to show it's active (optional, could just leave it)
        
        // Spawn Concept Node
        const conceptId = `concept-${Date.now()}`;
        
        // Parallel: Generate Image
        setStatusMessage(`Generating visualization for "${result.title}"...`);
        const imageBase64 = await generateConceptImage(result.imagePrompt);

        addNode({
          id: conceptId,
          type: NodeType.CONCEPT,
          label: result.title,
          content: result.explanation,
          role: target.role,
          image: imageBase64,
          x: (target.x || 0) + 100,
          y: (target.y || 0) + 100
        });

        addLink(target.id, conceptId);
        setStatusMessage('Analogy generated.');

      } catch (e) {
        setStatusMessage('Error generating expert content.');
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 4. Synthesis Flow
  const handleSynthesize = async () => {
    const principleNode = nodes.find(n => n.type === NodeType.GATEKEEPER);
    const concepts = nodes.filter(n => n.type === NodeType.CONCEPT);
    
    if (!principleNode || concepts.length === 0) {
      setStatusMessage("Need a principle and at least one concept to synthesize.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Synthesizing Research Roadmap...');

    try {
      const analogiesData = concepts.map(c => ({ role: c.role || 'General', content: c.content }));
      const roadmapText = await synthesizeRoadmap(principleNode.content, analogiesData);
      
      const roadmapId = `roadmap-${Date.now()}`;
      addNode({
        id: roadmapId,
        type: NodeType.ROADMAP,
        label: 'Research Roadmap',
        content: roadmapText,
        x: 0, y: 300
      });

      // Link all concepts to roadmap
      concepts.forEach(c => addLink(c.id, roadmapId));
      setStatusMessage('Roadmap created successfully.');

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
        onSynthesize={handleSynthesize}
        hasGatekeeper={hasGatekeeper}
        hasExperts={hasExperts}
        isProcessing={isProcessing}
        statusMessage={statusMessage}
      />
      
      <main className="flex-1 relative flex flex-col">
        <GraphCanvas 
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
        />
      )}
    </div>
  );
};

export default App;