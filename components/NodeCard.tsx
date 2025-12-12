import React, { useState, useRef } from 'react';
import { NodeData, NodeType } from '../types';
import { X, CheckSquare, Square, Maximize2, Minimize2, Zap, Activity, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface NodeCardProps {
  node: NodeData;
  onClose: () => void;
  onToggleSelection: (id: string) => void;
  onDeepDive?: (id: string) => void;
  isProcessing?: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onClose, onToggleSelection, onDeepDive, isProcessing = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null); // Ref for capturing content

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

  // Simple Markdown Parser
  const renderMarkdown = (content: string, isCompact: boolean = false) => {
    // Helper for inline styles (bold, italic)
    const parseInline = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-slate-400">$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-cyan-200">$1</code>');
    };

    const lines = content.split('\n');
    let html = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        html += `<div class="${isCompact ? 'h-2' : 'h-4'}"></div>`;
        return;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        html += `<h1 class="${isCompact ? 'text-lg' : 'text-2xl'} font-bold text-white mt-4 mb-2 border-b border-slate-700 pb-2">${parseInline(trimmed.slice(2))}</h1>`;
      } else if (trimmed.startsWith('## ')) {
        html += `<h2 class="${isCompact ? 'text-base' : 'text-xl'} font-bold text-white mt-3 mb-2">${parseInline(trimmed.slice(3))}</h2>`;
      } else if (trimmed.startsWith('### ')) {
        html += `<h3 class="${isCompact ? 'text-sm' : 'text-lg'} font-semibold text-cyan-100 mt-2 mb-1">${parseInline(trimmed.slice(4))}</h3>`;
      } 
      // Lists
      else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        html += `<div class="flex gap-2 ${isCompact ? 'ml-2 mb-1' : 'ml-4 mb-1'} text-slate-300">
                  <span class="text-cyan-500 select-none">•</span>
                  <span>${parseInline(trimmed.slice(2))}</span>
                 </div>`;
      }
      // Regular text
      else {
        html += `<p class="mb-1 text-slate-300 leading-relaxed">${parseInline(trimmed)}</p>`;
      }
    });

    return html;
  };

  // --- PDF Export Logic ---
  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);

    try {
      // Capture the element
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // High resolution
        backgroundColor: '#020617', // Match slate-950 background
        useCORS: true, // Needed for external/base64 images
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit content
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Create PDF with custom size matching the content (Single long page style for digital reading)
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `${node.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_synapse.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
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
                onClick={handleExportPdf}
                disabled={isExporting}
                className="p-2 hover:bg-indigo-900/30 rounded-lg transition-colors text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                title="Export to PDF"
              >
                 {isExporting ? <Activity size={18} className="animate-spin"/> : <Download size={18} />}
                 <span className="hidden sm:inline">Export PDF</span>
              </button>
              <div className="w-px h-8 bg-slate-800 mx-1 self-center"></div>
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
          <div className="flex-1 overflow-y-auto p-8 relative" id="printable-content">
            {/* Capture Target Wrapper - Added padding/bg to ensure clean PDF capture */}
            <div ref={contentRef} className="bg-slate-950 p-4"> 
              <div className={`flex flex-col ${isImageNode && node.image ? 'lg:flex-row' : ''} gap-8`}>
                
                {/* Image Section (if present) */}
                {isImageNode && node.image && (
                  <div className="lg:w-1/2 flex-shrink-0">
                    <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                      <img src={node.image} alt={node.label} className="w-full h-auto object-contain max-h-[600px]" />
                    </div>
                  </div>
                )}

                {/* Text Content */}
                <div className={`flex-1 min-w-0 ${isImageNode && node.image ? 'lg:w-1/2' : 'w-full'}`}>
                   {/* PDF Header Injection (Hidden normally, visible in PDF logic if we wanted, but sticking to WYSIWYG) */}
                   <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                    {node.type === NodeType.ROADMAP || node.isDeepDived ? (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(node.content) }} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{node.content}</p>
                    )}
                  </div>
                </div>

              </div>
              
              {/* Footer Stamp for PDF */}
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-600 flex justify-between">
                  <span>Generated by Synapse Discovery Engine</span>
                  <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          {/* Footer Actions (UI Only - Not in PDF) */}
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
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(node.content, true) }} />
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