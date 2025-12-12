import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3Base from 'd3';
import { NodeData, LinkData, NodeType } from '../types';
import { MousePointer2, AlertCircle, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Workaround for d3 types issues
const d3 = d3Base as any;

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
  const containerRef = useRef<SVGGElement>(null); // The group that gets transformed
  const simulationRef = useRef<any | null>(null);
  const zoomRef = useRef<any | null>(null);
  
  const [sourceNode, setSourceNode] = useState<string | null>(null);

  // Fix for D3 Mutation/Disconnect Issue:
  // D3 mutates link objects to replace string IDs with Node references. 
  // When 'nodes' state updates in React (e.g. toggling selection), we get NEW node objects.
  // The old 'links' still point to the OLD node objects.
  // We must generate fresh link objects using string IDs whenever nodes change, 
  // forcing D3 to re-resolve the source/target to the NEW node objects.
  const displayLinks = useMemo(() => {
    return links.map((l: any) => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target
    }));
  }, [links, nodes]);

  // Initialize Zoom & Simulation
  useEffect(() => {
    if (!wrapperRef.current || !svgRef.current || !containerRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    // 1. Setup Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: any) => {
        d3.select(containerRef.current).attr("transform", event.transform);
      });
    
    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null); // Disable double click zoom

    // Center initial view
    const initialTransform = d3.zoomIdentity.translate(width/2, height/2).scale(1);
    d3.select(svgRef.current).call(zoom.transform, initialTransform);

    // 2. Setup Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(displayLinks).id((d: any) => d.id).distance(180))
      .force("charge", d3.forceManyBody().strength(-500)) // Repulsion
      .force("collide", d3.forceCollide().radius(70)) // Prevent overlap
      .force("x", d3.forceX(0).strength(0.05)) // Gentle pull to center horizontal
      .force("y", d3.forceY(0).strength(0.05)); // Gentle pull to center vertical

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Update simulation when data changes
  useEffect(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;
    
    // Maintain existing node positions if they exist to prevent jumping
    simulation.nodes(nodes);
    
    // Update links with the fresh set that uses string IDs, causing D3 to re-bind
    const linkForce = simulation.force("link") as any;
    linkForce.links(displayLinks);
    
    simulation.alpha(1).restart();
  }, [nodes, displayLinks]);

  // Render Loop & Drag Logic
  useEffect(() => {
    if (!simulationRef.current || !containerRef.current) return;

    const container = d3.select(containerRef.current);
    const simulation = simulationRef.current;

    const linkGroup = container.select(".links");
    const nodeGroup = container.select(".nodes");

    // --- Draw Links ---
    // Use displayLinks here too, with a safe key function
    const linkSelection = linkGroup.selectAll("line")
      .data(displayLinks, (d: any) => {
         const sourceId = d.source.id || d.source;
         const targetId = d.target.id || d.target;
         return `${sourceId}-${targetId}`;
      });

    linkSelection.exit().remove();

    const linkEnter = linkSelection.enter().append("line")
      .attr("stroke", "#475569")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    const allLinks = linkEnter.merge(linkSelection);

    // --- Draw Nodes ---
    const nodeSelection = nodeGroup.selectAll("foreignObject")
      .data(nodes, (d: any) => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter().append("foreignObject")
      .attr("width", 140)
      .attr("height", 80)
      .attr("overflow", "visible");
      
    nodeEnter.append("xhtml:div")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center");

    const allNodes = nodeEnter.merge(nodeSelection);

    // Update Node Content
    allNodes.select("div")
      .html((d: any) => {
        let bgColor = "bg-slate-800";
        let borderColor = "border-slate-600";
        
        if (d.type === NodeType.GATEKEEPER) { bgColor = "bg-cyan-950"; borderColor = "border-cyan-500"; }
        if (d.type === NodeType.EXPERT) { bgColor = "bg-purple-950"; borderColor = "border-purple-500"; }
        if (d.type === NodeType.CONCEPT) { bgColor = "bg-pink-950"; borderColor = "border-pink-500"; }
        if (d.type === NodeType.ROADMAP) { bgColor = "bg-yellow-950"; borderColor = "border-yellow-500"; }
        
        const isSelected = d.id === sourceNode;
        const ring = isSelected ? "ring-2 ring-white" : "";
        const label = `<span class="text-xs font-bold text-center line-clamp-2 px-2">${d.label}</span>`;
        const typeLabel = `<span class="absolute -top-2 left-2 text-[10px] uppercase bg-slate-900 px-1 text-slate-400 border border-slate-700 rounded">${d.role || d.type}</span>`;
        const selectionBadge = d.selectedForRoadmap 
          ? `<div class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 text-slate-900 rounded-full flex items-center justify-center border border-white text-[10px] font-bold">✓</div>` 
          : '';

        return `
          <div class="relative w-32 h-20 ${bgColor} border ${borderColor} ${ring} rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform select-none pointer-events-auto">
             ${typeLabel}
             ${label}
             ${selectionBadge}
             ${d.image ? '<div class="absolute -right-2 -bottom-2 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-bold text-[10px]">Img</div>' : ''}
          </div>
        `;
      });

    // --- Drag Behavior ---
    const drag = d3.drag()
      .on("start", (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    allNodes.call(drag);

    // --- Click Handlers ---
    allNodes.on("click", (event: any, d: any) => {
      if (event.defaultPrevented) return; // Ignore drag end clicks

      if (connectionMode) {
        if (!sourceNode) {
          setSourceNode(d.id);
        } else {
          if (d.id !== sourceNode) {
            onConnect(sourceNode, d.id);
            setSourceNode(null);
            setConnectionMode(false);
          } else {
            setSourceNode(null);
          }
        }
      } else {
        onNodeClick(d);
      }
    });

    // --- Tick ---
    simulation.on("tick", () => {
      allLinks
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      allNodes
        .attr("x", (d: any) => d.x! - 70) 
        .attr("y", (d: any) => d.y! - 40);
    });

  }, [nodes, displayLinks, connectionMode, sourceNode, onNodeClick, onConnect, setConnectionMode]);

  // View Controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const handleFitView = () => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const width = wrapperRef.current?.clientWidth || 800;
    const height = wrapperRef.current?.clientHeight || 600;
    const padding = 100;

    // Calculate bounds
    const xMin = d3.min(nodes, (d: any) => d.x!) || 0;
    const xMax = d3.max(nodes, (d: any) => d.x!) || 0;
    const yMin = d3.min(nodes, (d: any) => d.y!) || 0;
    const yMax = d3.max(nodes, (d: any) => d.y!) || 0;

    const graphWidth = xMax - xMin;
    const graphHeight = yMax - yMin;
    const midX = (xMin + xMax) / 2;
    const midY = (yMin + yMax) / 2;

    if (graphWidth === 0 || graphHeight === 0) return;

    const scale = Math.min(
      (width - padding) / graphWidth,
      (height - padding) / graphHeight,
      1.5 // Max scale cap
    );

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-midX, -midY);

    svg.transition().duration(750).call(zoomRef.current.transform, transform);
  };

  return (
    <div className="flex-1 relative bg-slate-950 overflow-hidden" ref={wrapperRef}>
       {/* Info Panel */}
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

       {/* View Controls */}
       <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2 bg-slate-900/80 backdrop-blur border border-slate-700 p-1.5 rounded-md shadow-lg">
         <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Zoom In"><ZoomIn size={18}/></button>
         <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Zoom Out"><ZoomOut size={18}/></button>
         <button onClick={handleFitView} className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Fit to Screen"><Maximize size={18}/></button>
       </div>

      {/* Helper message */}
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
        <g ref={containerRef}>
          <g className="links"></g>
          <g className="nodes"></g>
        </g>
      </svg>
    </div>
  );
};

export default GraphCanvas;