import React, { useState, useEffect } from 'react';
import { Network, FileText, ArrowLeft, Save, Loader2, Zap, BrainCircuit, AlertCircle, RotateCw } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

interface FileOption { _id: string; name: string; type: string; }
interface Node { id: string; label: string; val: number; }
interface Link { source: string; target: string; label: string; }
interface GraphData { nodes: Node[]; links: Link[]; }

interface KgGeneratorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

const KgGeneratorWorkspace: React.FC<KgGeneratorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<FileOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) setFiles(data.files);
        else setFiles([
          { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
          { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' }
        ]);
      })
      .catch(() => setFiles([
        { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
        { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' }
      ]));
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsGenerating(true); setGraphData(null); setIsSaved(false); setError('');
    try {
      const getRes = await fetch(`http://localhost:5000/api/graphs/${selectedFile}`);
      if (getRes.ok) {
        const data = await getRes.json();
        setGraphData({ nodes: data.nodes, links: data.links });
        setIsSaved(true); setIsGenerating(false); return;
      }
      const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';
      const genRes = await fetch('http://localhost:5000/api/graphs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-model-name': llmModel },
        body: JSON.stringify({ documentId: selectedFile })
      });
      if (!genRes.ok) throw new Error('Failed to generate graph via AI');
      const genData = await genRes.json();
      setGraphData(genData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate graph');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGraph = async () => {
    if (!selectedFile || !graphData) return;
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedFile, nodes: graphData.nodes, links: graphData.links })
      });
      if (res.ok) setIsSaved(true);
    } catch (error) {
      console.error('Failed to save graph:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const clearGraph = () => { setGraphData(null); setSelectedFile(''); setSelectedFileName(''); setIsSaved(false); setError(''); };

  const getDynamicPositions = (nodes: Node[]) => {
    const positions: Record<string, { x: number; y: number }> = {};
    if (!nodes || nodes.length === 0) return positions;
    const sortedNodes = [...nodes].sort((a, b) => b.val - a.val);
    const centerNode = sortedNodes[0];
    positions[centerNode.id] = { x: 500, y: 400 };
    const restNodes = sortedNodes.slice(1);
    const numNodes = restNodes.length;
    const radius = 300;
    const angleStep = (2 * Math.PI) / (numNodes || 1);
    restNodes.forEach((node, idx) => {
      const angle = idx * angleStep;
      positions[node.id] = { x: 500 + radius * Math.cos(angle), y: 400 + radius * Math.sin(angle) };
    });
    return positions;
  };

  const currentPositions = graphData ? getDynamicPositions(graphData.nodes) : {};

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate?.('tools')} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Knowledge Graph</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {graphData ? `${graphData.nodes.length} nodes · ${graphData.links.length} connections` : 'Map relationships between concepts visually'}
            </p>
          </div>
        </div>
        {graphData && (
          <div className="flex items-center gap-2">
            <button onClick={handleSaveGraph} disabled={isSaving || isSaved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isSaved ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save Graph'}
            </button>
            <button onClick={clearGraph} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition-colors">
              <RotateCw className="w-3.5 h-3.5" /> New Graph
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left Sidebar */}
        <div className="w-60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">
            
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Source Document</label>
              <select
                value={selectedFile}
                onChange={e => {
                  setSelectedFile(e.target.value);
                  setSelectedFileName(files.find(f => f._id === e.target.value)?.name || '');
                  setGraphData(null); setIsSaved(false); setError('');
                }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              >
                <option value="">Select a document...</option>
                {files.map(f => <option key={f._id} value={f._id}>{f.name} ({f.type})</option>)}
              </select>
            </div>

            {/* Info Cards */}
            <div className="space-y-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">How it works</p>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 leading-relaxed">AI extracts key concepts and maps the relationships between them into a visual graph.</p>
              </div>
              {graphData && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Nodes</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{graphData.nodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Connections</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{graphData.links.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Document</span>
                    <span className="font-bold text-neutral-900 dark:text-white truncate max-w-24">{selectedFileName}</span>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleGenerate} disabled={!selectedFile || isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              {isGenerating ? <><BrainCircuit className="w-4 h-4 animate-pulse" /> Mapping...</> : <><Zap className="w-4 h-4" /> Generate Graph</>}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Graph Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {!isGenerating && !graphData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                <Network className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">No graph yet</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">Select a document and click Generate to visualise concept relationships</p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Mapping concept relationships...</p>
                <p className="text-xs text-neutral-500 mt-1">This may take a moment</p>
              </div>
            </div>
          )}

          {graphData && !isGenerating && (
            <div className="flex-1 overflow-hidden">
              <div className="w-full h-full relative bg-neutral-50 dark:bg-neutral-950/30">
                {/* Dot grid background */}
                <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="w-full h-full relative flex items-center justify-center">
                  <div className="w-full h-full absolute inset-0">
                    <ForceGraph2D
                      graphData={graphData}
                      nodeLabel="label"
                      nodeAutoColorBy="id"
                      linkDirectionalParticles={2}
                      linkDirectionalParticleSpeed={0.005}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KgGeneratorWorkspace;