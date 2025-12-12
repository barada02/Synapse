import React from 'react';
import { NodeData, NodeType } from '../types';
import { X, CheckSquare, Square } from 'lucide-react';

interface NodeCardProps {
  node: NodeData;
  onClose: () => void;
  onToggleSelection: (id: string) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onClose, onToggleSelection }) => {
  const isImageNode = node.type === NodeType.CONCEPT;
  const isSelectable = node.type === NodeType.CONCEPT || node.type === NodeType.GATEKEEPER;

  return (
    <div className="absolute top-4 right-4 w-96 max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl z-50 text-slate-100 flex flex-col animate-in slide-in-from-right-10 fade-in duration-300">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900/95 z-10">
        <div className="flex items-center gap-2">
           <span className={`w-3 h-3 rounded-full ${
             node.type === NodeType.GATEKEEPER ? 'bg-cyan-500' :
             node.type === NodeType.EXPERT ? 'bg-purple-500' :
             node.type === NodeType.CONCEPT ? 'bg-pink-500' :
             node.type === NodeType.ROADMAP ? 'bg-yellow-500' : 'bg-slate-500'
           }`} />
           <h2 className="font-bold text-lg truncate w-56" title={node.label}>{node.label}</h2>
        </div>
        <button onClick={onClose} className="hover:bg-slate-800 p-1 rounded transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 flex-1 space-y-4">
        {node.role && (
          <div className="inline-block px-2 py-1 bg-slate-800 text-xs text-slate-400 rounded border border-slate-700">
            Agent: {node.role}
          </div>
        )}

        {isImageNode && node.image && (
          <div className="rounded-lg overflow-hidden border border-slate-700 shadow-md">
            <img src={node.image} alt={node.label} className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="prose prose-invert prose-sm">
          {node.type === NodeType.ROADMAP ? (
            <div dangerouslySetInnerHTML={{ __html: node.content.replace(/\n/g, '<br/>') }} />
          ) : (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{node.content}</p>
          )}
        </div>
        
        {isSelectable && (
          <button 
            onClick={() => onToggleSelection(node.id)}
            className={`w-full py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors border ${
              node.selectedForRoadmap 
                ? 'bg-green-900/30 border-green-600 text-green-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {node.selectedForRoadmap ? <CheckSquare size={16} /> : <Square size={16} />}
            {node.selectedForRoadmap ? 'Included in Roadmap' : 'Include in Roadmap'}
          </button>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-500 flex justify-between">
        <span>ID: {node.id.split('-')[0]}...</span>
        <span className="uppercase tracking-wider">{node.type}</span>
      </div>
    </div>
  );
};

export default NodeCard;