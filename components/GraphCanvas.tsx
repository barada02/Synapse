import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { NodeData, LinkData, NodeType } from '../types';
import { MousePointer2, AlertCircle } from 'lucide-react';

interface GraphCanvasProps {
  nodes: NodeData[];
  links: LinkData[];
  onNodeClick: (node: NodeData) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  connectionMode: boolean;
  setConnectionMode: (mode: boolean) => void;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ 
  nodes, 
  links, 
  onNodeClick, 
  onConnect,
  connectionMode,
  setConnectionMode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const [sourceNode, setSourceNode] = useState<string | null>(null);

  // Initialize simulation
  useEffect(() => {
    if (!wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    const simulation = d3.forceSimulation<NodeData, LinkData>(nodes)
      .force("link", d3.forceLink<NodeData, LinkData>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(60));

    simulationRef.current = simulation;

    // Cleanup
    return () => {
      simulation.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to setup

  // Update simulation when data changes
  useEffect(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;
    
    // Update nodes and links
    simulation.nodes(nodes);
    const linkForce = simulation.force("link") as d3.ForceLink<NodeData, LinkData>;
    linkForce.links(links);
    
    // Reheat simulation
    simulation.alpha(1).restart();
  }, [nodes, links]);

  // Render loop using a tick handler that updates React state or DOM directly
  // Here we use D3 to update the DOM for performance
  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const simulation = simulationRef.current;

    // Groups
    const linkGroup = svg.select(".links");
    const nodeGroup = svg.select(".nodes");

    // Draw Links
    const linkSelection = linkGroup.selectAll<SVGLineElement, LinkData>("line")
      .data(links, d => `${(d.source as NodeData).id}-${(d.target as NodeData).id}`);

    linkSelection.exit().remove();

    const linkEnter = linkSelection.enter().append("line")
      .attr("stroke", "#475569")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    const allLinks = linkEnter.merge(linkSelection);

    // Draw Nodes (Using foreignObject for HTML content)
    const nodeSelection = nodeGroup.selectAll<SVGForeignObjectElement, NodeData>("foreignObject")
      .data(nodes, d => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter().append("foreignObject")
      .attr("width", 140)
      .attr("height", 80)
      .attr("overflow", "visible");
      
    // Append the div inside
    nodeEnter.append("xhtml:div")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center");

    const allNodes = nodeEnter.merge(nodeSelection);

    // Update Node Content
    allNodes.select("div")
      .html(d => {
        let bgColor = "bg-slate-800";
        let borderColor = "border-slate-600";
        
        if (d.type === NodeType.GATEKEEPER) { bgColor = "bg-cyan-950"; borderColor = "border-cyan-500"; }
        if (d.type === NodeType.EXPERT) { bgColor = "bg-purple-950"; borderColor = "border-purple-500"; }
        if (d.type === NodeType.CONCEPT) { bgColor = "bg-pink-950"; borderColor = "border-pink-500"; }
        if (d.type === NodeType.ROADMAP) { bgColor = "bg-yellow-950"; borderColor = "border-yellow-500"; }
        
        // Highlight logic for connection mode
        const isSelected = d.id === sourceNode;
        const ring = isSelected ? "ring-2 ring-white" : "";

        // Icon based on type (simplified)
        const label = `<span class="text-xs font-bold text-center line-clamp-2 px-2">${d.label}</span>`;
        const typeLabel = `<span class="absolute -top-2 left-2 text-[10px] uppercase bg-slate-900 px-1 text-slate-400 border border-slate-700 rounded">${d.role || d.type}</span>`;
        
        return `
          <div class="relative w-32 h-20 ${bgColor} border ${borderColor} ${ring} rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform select-none pointer-events-auto">
             ${typeLabel}
             ${label}
             ${d.image ? '<div class="absolute -right-2 -bottom-2 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-bold text-[10px]">Img</div>' : ''}
          </div>
        `;
      });

    // Drag Behavior
    const drag = d3.drag<SVGForeignObjectElement, NodeData>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    allNodes.call(drag);

    // Click Handlers
    allNodes.on("click", (event, d) => {
      // If dragging, don't trigger click
      if (event.defaultPrevented) return;

      if (connectionMode) {
        if (!sourceNode) {
          setSourceNode(d.id);
        } else {
          if (d.id !== sourceNode) {
            onConnect(sourceNode, d.id);
            setSourceNode(null);
            setConnectionMode(false);
          } else {
            setSourceNode(null); // Deselect if clicking same
          }
        }
      } else {
        onNodeClick(d);
      }
    });

    // Simulation Tick
    simulation.on("tick", () => {
      allLinks
        .attr("x1", d => (d.source as NodeData).x!)
        .attr("y1", d => (d.source as NodeData).y!)
        .attr("x2", d => (d.target as NodeData).x!)
        .attr("y2", d => (d.target as NodeData).y!);

      allNodes
        .attr("x", d => d.x! - 70) // Center offset (width/2)
        .attr("y", d => d.y! - 40); // Center offset (height/2)
    });

  }, [nodes, links, connectionMode, sourceNode, onNodeClick, onConnect, setConnectionMode]);


  return (
    <div className="flex-1 relative bg-slate-950 overflow-hidden" ref={wrapperRef}>
       {/* Canvas Controls */}
       <div className="absolute top-4 left-4 z-10 flex gap-2">
         <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-md shadow-lg text-xs text-slate-400">
            {nodes.length} Nodes • {links.length} Links
         </div>
         <button 
           onClick={() => {
             setConnectionMode(!connectionMode);
             setSourceNode(null);
           }}
           className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold shadow-lg border transition-colors ${connectionMode ? 'bg-cyan-600 text-white border-cyan-400 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
         >
           <MousePointer2 size={14} />
           {connectionMode ? (sourceNode ? "Select Target" : "Select Source") : "Link Nodes"}
         </button>
       </div>

      {/* Helper message for connection mode */}
      {connectionMode && (
         <div className="absolute top-16 left-4 z-10 bg-cyan-900/80 border border-cyan-500 text-cyan-100 px-3 py-2 rounded-md text-xs flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} />
            {sourceNode 
              ? "Click another node to connect." 
              : "Click a node to start the connection."}
         </div>
      )}

      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
        <g className="links"></g>
        <g className="nodes"></g>
      </svg>
    </div>
  );
};

export default GraphCanvas;