import React, { useState } from 'react';
import { NodeData, NodeType } from '../types';
import { X, CheckSquare, Square, Maximize2, Minimize2, Zap, Activity } from 'lucide-react';

interface NodeCardProps {
  node: NodeData;
  onClose: () => void;
  onToggleSelection: (id: string) => void;
  onDeepDive?: (id: string) => void; // Optional for backward compatibility, but we use it
  isProcessing?: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onClose, onToggleSelection, onDeepDive, isProcessing = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isImageNode = node.type === NodeType.CONCEPT;
  const isSelectable = node.type === NodeType.CONCEPT || node.type === NodeType.GATEKEEPER;
  const canDeepDive = isImageNode && !node.isDeepDived && onDeepDive;

  // Color mapping logic
  const getColor = () => {
      if (node.type === NodeType.GATEKEEPER) return 'bg-cyan-500';
      if (node.type === NodeType.EXPERT) return 'bg-purple-500';
      if (node.type === NodeType.CONCEPT) return 'bg-pink-500';
      if (node.type === NodeType.ROADMAP) return 'bg-yellow-500';
      return 'bg-slate-500';
  };

  // --- MODAL VIEW (Expanded) ---
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-slate-950 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full shadow-lg shadow-white/10 ${getColor()}`} />
              <div>
                  <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">{node.label}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">{node.type}</span>
                    {node.role && <span className="text-sm text-cyan-400 font-medium">via {node.role}</span>}
                  </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                title="Minimize to sidebar"
              >
                <Minimize2 size={18} />
                <span className="hidden sm:inline">Minimize</span>
              </button>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-red-900/50 hover:text-red-400 rounded-lg transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className={`flex flex-col ${isImageNode && node.image ? 'lg:flex-row' : ''} gap-8`}>
              
              {/* Image Section (if present) */}
              {isImageNode && node.image && (
                <div className="lg:w-1/2 flex-shrink-0">
                  <div className="sticky top-0 rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                    <img src={node.image} alt={node.label} className="w-full h-auto object-contain max-h-[600px]" />
                  </div>
                </div>
              )}

              {/* Text Content */}
              <div className={`flex-1 min-w-0 ${isImageNode && node.image ? 'lg:w-1/2' : 'w-full'}`}>
                <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                  {node.type === NodeType.ROADMAP || node.isDeepDived ? (
                    // Render HTML/Markdown-ish content (simple replace for newlines)
                    // If deep dived, it will contain markdown headers which simple replacement handles poorly but is legible
                    // For better markdown support we'd use a library, but text-replacement serves the MVP
                    <div dangerouslySetInnerHTML={{ __html: node.content.replace(/\n/g, '<br/>').replace(/### (.*)/g, '<h3 class="text-xl font-bold text-white mt-6 mb-2">$1</h3>') }} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{node.content}</p>
                  )}
                </div>
              </div>

            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-600 font-mono hidden sm:block">
              ID: {node.id.split('-')[0]}...
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
                {canDeepDive && (
                    <button 
                        onClick={() => onDeepDive && onDeepDive(node.id)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? <Activity className="animate-spin" size={20} /> : <Zap size={20} />}
                        <span>Deep Dive Connection</span>
                    </button>
                )}

                {isSelectable && (
                <button 
                    onClick={() => onToggleSelection(node.id)}
                    className={`flex-1 sm:flex-none px-6 py-3 rounded-lg flex items-center justify-center gap-3 font-semibold transition-all transform active:scale-95 ${
                    node.selectedForRoadmap 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 ring-1 ring-green-400' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
                    }`}
                >
                    {node.selectedForRoadmap ? <CheckSquare size={20} className="text-white" /> : <Square size={20} />}
                    <span>{node.selectedForRoadmap ? 'Select for Roadmap' : 'Select for Roadmap'}</span>
                </button>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SIDEBAR VIEW (Default) ---
  return (
    <div className="fixed top-0 right-0 z-40 h-full w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-start">
        <div className="flex items-center gap-3">
           <div className={`w-3 h-3 rounded-full ${getColor()}`} />
           <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{node.type}</span>
              <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{node.label}</h2>
           </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setIsExpanded(true)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
            title="Expand to full view"
          >
            <Maximize2 size={18} />
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Role Tag */}
        {node.role && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded border border-slate-700">
            <span className="text-xs text-slate-400">Context:</span>
            <span className="text-xs font-semibold text-cyan-400">{node.role}</span>
          </div>
        )}

        {/* Image Preview */}
        {isImageNode && node.image && (
          <div className="rounded-lg overflow-hidden border border-slate-700 bg-black">
            <img src={node.image} alt="Concept" className="w-full h-auto" />
          </div>
        )}

        {/* Text */}
        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
          {node.type === NodeType.ROADMAP || node.isDeepDived ? (
            <div dangerouslySetInnerHTML={{ __html: node.content.replace(/\n/g, '<br/>').replace(/### (.*)/g, '<h3 class="text-sm font-bold text-white mt-4 mb-1 border-t border-slate-700 pt-2">$1</h3>') }} />
          ) : (
            <p className="whitespace-pre-wrap">{node.content}</p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col gap-3">
        {canDeepDive && (
            <button 
                onClick={() => onDeepDive && onDeepDive(node.id)}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-md flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow transition-all active:scale-95 disabled:opacity-50"
            >
                {isProcessing ? <Activity className="animate-spin" size={16} /> : <Zap size={16} />}
                <span>Deep Dive Connection</span>
            </button>
        )}

        {isSelectable && (
          <button 
            onClick={() => onToggleSelection(node.id)}
            className={`w-full py-2.5 rounded-md flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95 ${
              node.selectedForRoadmap 
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg ring-1 ring-green-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            {node.selectedForRoadmap ? <CheckSquare size={16} /> : <Square size={16} />}
            <span>{node.selectedForRoadmap ? 'Included in Roadmap' : 'Include in Roadmap'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeCard;