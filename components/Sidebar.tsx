import React, { useState } from 'react';
import { Activity, Play, Plus, BrainCircuit, Wand2, RefreshCw, UserCircle } from 'lucide-react';
import { ExpertDefinition } from '../types';

interface SidebarProps {
  onStart: (role: string, input: string) => void;
  onAddExpert: (expert: ExpertDefinition) => void;
  onGenerateSpecialist: (role: string) => void;
  onSynthesize: () => void;
  onReset: () => void;
  hasGatekeeper: boolean;
  hasExperts: boolean;
  isProcessing: boolean;
  statusMessage: string;
  availableExperts: ExpertDefinition[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onStart, 
  onAddExpert,
  onGenerateSpecialist,
  onSynthesize,
  onReset,
  hasGatekeeper,
  hasExperts,
  isProcessing,
  statusMessage,
  availableExperts
}) => {
  const [roleInput, setRoleInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [customExpert, setCustomExpert] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleInput.trim() && topicInput.trim()) {
      onStart(roleInput, topicInput);
    }
  };

  const handleCustomExpertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customExpert.trim()) {
      onGenerateSpecialist(customExpert);
      setCustomExpert('');
      setShowCustomInput(false);
    }
  };

  const handleResetClick = () => {
    if (window.confirm("Start new session? Current progress will be lost.")) {
      setRoleInput('');
      setTopicInput('');
      onReset();
    }
  };

  return (
    <div className="w-80 h-full bg-slate-950 border-r border-slate-800 flex flex-col shadow-xl z-10 flex-shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2 text-cyan-400">
            <Activity size={24} />
            <h1 className="text-xl font-bold tracking-tight text-white">Synapse v2</h1>
          </div>
          <p className="text-xs text-slate-400">Multimodal Discovery Engine</p>
        </div>
        <button 
          onClick={handleResetClick}
          className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
          title="Reset"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Phase 1: Input */}
        <section className={`transition-opacity duration-500 ${hasGatekeeper ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs">1</span>
            <h2>Define Scope</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
             <div>
              <label className="text-xs text-slate-500 block mb-1">Your Role / Domain</label>
              <div className="relative">
                <UserCircle size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="e.g. Architect, Student"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Core Topic</label>
              <textarea 
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. How does fungal mycelium distribute nutrients?"
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-md p-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={!roleInput.trim() || !topicInput.trim() || isProcessing}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && !hasGatekeeper ? <Activity className="animate-spin" size={16}/> : <Play size={16} />}
              Initialize Gatekeeper
            </button>
          </form>
        </section>

        {/* Phase 2: Experts */}
        <section className={`transition-opacity duration-500 ${!hasGatekeeper ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
           <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs">2</span>
            <h2>Invoke Experts</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">Click to spawn an agent. Drag from Gatekeeper to Agent to connect.</p>
          
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
            {availableExperts.map((expert) => (
              <button
                key={expert.id}
                onClick={() => onAddExpert(expert)}
                disabled={isProcessing}
                className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-md group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${expert.color}`}></div>
                  <span className="text-sm text-slate-300 group-hover:text-white truncate w-32">{expert.role}</span>
                </div>
                <Plus size={14} className="text-slate-600 group-hover:text-white" />
              </button>
            ))}
          </div>

          {!showCustomInput ? (
            <button 
              onClick={() => setShowCustomInput(true)}
              className="mt-3 w-full py-2 border border-dashed border-slate-700 text-slate-500 text-xs hover:text-cyan-400 hover:border-cyan-500 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Wand2 size={14} />
              Generate Specialist
            </button>
          ) : (
            <form onSubmit={handleCustomExpertSubmit} className="mt-3">
              <input
                type="text"
                autoFocus
                placeholder="e.g. Urban Planner"
                value={customExpert}
                onChange={(e) => setCustomExpert(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={isProcessing} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 rounded">
                    {isProcessing ? '...' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowCustomInput(false)} className="flex-1 bg-transparent hover:bg-slate-900 text-slate-500 text-xs py-1.5 rounded">Cancel</button>
              </div>
            </form>
          )}
        </section>

        {/* Phase 3: Synthesis */}
        <section className={`transition-opacity duration-500 ${!hasExperts ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs">3</span>
            <h2>Synthesis</h2>
          </div>
          <p className="text-xs text-slate-500 mb-2">Select nodes in the workspace, then click below.</p>
          <button 
            onClick={onSynthesize}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 px-4 rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-50"
          >
            {isProcessing ? <Activity className="animate-spin" size={16}/> : <BrainCircuit size={16} />}
            Generate Roadmap
          </button>
        </section>

      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 text-xs font-mono text-cyan-400 truncate">
        {statusMessage || "System Ready"}
      </div>
    </div>
  );
};

export default Sidebar;