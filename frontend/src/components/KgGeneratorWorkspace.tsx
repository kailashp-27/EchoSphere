import React, { useState, useEffect } from 'react';
import { Network, FileText, ArrowLeft, Save, Loader2, Zap, BrainCircuit } from 'lucide-react';

interface FileOption {
  _id: string;
  name: string;
  type: string;
}

interface Node {
  id: string;
  label: string;
  val: number;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface KgGeneratorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

const KgGeneratorWorkspace: React.FC<KgGeneratorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<FileOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Fetch files for the dropdown
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
        } else {
          // Fallback mocks
          setFiles([
            { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
            { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' }
          ]);
        }
      })
      .catch(err => {
        console.error('Error fetching files, using mocks', err);
        setFiles([
          { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
          { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' }
        ]);
      });
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsGenerating(true);
    setGraphData(null);
    setIsSaved(false);

    try {
      const getRes = await fetch(`http://localhost:5000/api/graphs/${selectedFile}`);
      if (getRes.ok) {
        const data = await getRes.json();
        setGraphData({ nodes: data.nodes, links: data.links });
        setIsSaved(true);
        setIsGenerating(false);
        return;
      }

      const genRes = await fetch('http://localhost:5000/api/graphs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedFile })
      });

      if (!genRes.ok) throw new Error('Failed to generate graph via AI');

      const genData = await genRes.json();
      setGraphData(genData);
      setIsGenerating(false);

    } catch (err) {
      console.error(err);
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
        body: JSON.stringify({
          documentId: selectedFile,
          nodes: graphData.nodes,
          links: graphData.links
        })
      });
      if (res.ok) setIsSaved(true);
    } catch (error) {
      console.error('Failed to save graph:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const clearSelection = () => {
    setGraphData(null);
    setSelectedFile('');
    setIsSaved(false);
  };

  // Node rendering setup: calculate dynamic positions around a wider circle
  const getDynamicPositions = (nodes: Node[]) => {
    const positions: Record<string, { x: number, y: number }> = {};
    if (!nodes || nodes.length === 0) return positions;

    const sortedNodes = [...nodes].sort((a, b) => b.val - a.val);
    const centerNode = sortedNodes[0];

    // Increased canvas center to 500, 400 for a larger 1000x800 viewBox
    positions[centerNode.id] = { x: 500, y: 400 };

    const restNodes = sortedNodes.slice(1);
    const numNodes = restNodes.length;

    // Increased radius to give edges and nodes more breathing room
    const radius = 300;
    const angleStep = (2 * Math.PI) / (numNodes || 1);

    restNodes.forEach((node, idx) => {
      const angle = idx * angleStep;
      positions[node.id] = {
        x: 500 + radius * Math.cos(angle),
        y: 400 + radius * Math.sin(angle)
      };
    });

    return positions;
  };

  const currentPositions = graphData ? getDynamicPositions(graphData.nodes) : {};

  const getActiveFileName = () => {
    return files.find(f => f._id === selectedFile)?.name || 'Unknown Document';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500 relative">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('tools')}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-600/10 text-neutral-600 dark:text-neutral-400 rounded-2xl flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Knowledge Graph Generator
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">
                Extract core concepts and map their relationships visually.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Source Document</label>
              <select
                value={selectedFile}
                onChange={(e) => {
                  setSelectedFile(e.target.value);
                  setGraphData(null);
                  setIsSaved(false);
                }}
                className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">Select a document to process...</option>
                {files.map(f => (
                  <option key={f._id} value={f._id}>{f.name} ({f.type})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedFile || isGenerating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <BrainCircuit className="w-5 h-5 animate-pulse" />
                  AI is mapping relationships...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Knowledge Graph
                </>
              )}
            </button>
          </div>

          {graphData && (
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Network className="w-4 h-4" />
                  <span className="text-sm">Graph generated from {getActiveFileName()}</span>
                </div>
                <button
                  onClick={handleSaveGraph}
                  disabled={isSaving || isSaved}
                  className={`p-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${isSaved 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaved ? 'Saved' : 'Save Graph'}</span>
                </button>
              </div>

              <div className="w-full h-[600px] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden relative group bg-neutral-50 dark:bg-neutral-900/50">
                <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="w-full h-full relative z-10 flex items-center justify-center">
                  <svg className="w-full h-full max-w-[1000px] max-h-[800px]" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
                    {/* 1. Render Edges First (so they go behind nodes) */}
                {graphData.links.map((link, idx) => {
                  const sourcePos = currentPositions[link.source] || { x: 500, y: 400 };
                  const targetPos = currentPositions[link.target] || { x: 500, y: 400 };

                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;

                  return (
                    <g key={`link-${idx}`}>
                      {/* The connecting line */}
                      <line
                        x1={sourcePos.x} y1={sourcePos.y}
                        x2={targetPos.x} y2={targetPos.y}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-neutral-300 dark:text-neutral-700"
                      />
                      {/* HTML Badge for the relationship label using foreignObject */}
                      <foreignObject x={midX - 75} y={midY - 14} width="150" height="28" className="overflow-visible">
                        <div className="flex items-center justify-center w-full h-full">
                          <span className="bg-neutral-50 dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 whitespace-nowrap shadow-sm">
                            {link.label.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}

                {/* 2. Render Nodes Second (so they sit on top of the lines) */}
                {graphData.nodes.map(node => {
                  const pos = currentPositions[node.id] || { x: 500, y: 400 };

                  // Define a bounding box for our HTML node
                  const nodeWidth = 180;
                  const nodeHeight = 72;

                  return (
                    <g key={node.id} className="cursor-pointer transition-transform hover:-translate-y-1 hover:scale-105 duration-200" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                      <foreignObject
                        x={pos.x - (nodeWidth / 2)}
                        y={pos.y - (nodeHeight / 2)}
                        width={nodeWidth}
                        height={nodeHeight}
                      >
                        {/* Tailwind styled HTML Pill */}
                        <div className="flex items-center justify-center w-full h-full p-3 bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-500 rounded-2xl backdrop-blur-md shadow-md text-center">
                          <span className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2 leading-tight select-none">
                            {node.label}
                          </span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
                  </svg>
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