import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Network, ArrowLeft, Save, Loader2, Zap, BrainCircuit,
  AlertCircle, RotateCw, Download,
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods } from 'react-force-graph-2d';

interface FileOption { _id: string; name: string; type: string; }
interface GraphNode { id: string; label: string; val: number; color?: string; x?: number; y?: number; }
interface GraphLink { source: string; target: string; label: string; }
interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }

interface KgGeneratorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

// Palette for node types — we assign a colour category by hash
const NODE_PALETTE = [
  '#6366f1', // indigo
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
  '#f472b6', // pink
  '#facc15', // yellow
  '#60a5fa', // blue
];

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return NODE_PALETTE[Math.abs(h) % NODE_PALETTE.length];
}

// Derive a "type" label from node label (first word, capitalised)
function nodeType(label: string): string {
  return (label || '').split(' ')[0] || 'Node';
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
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });

  // Resize observer so graph fills its container
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Fetch files
  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(r => r.json())
      .then(d => {
        if (d.files?.length) setFiles(d.files);
        else setFiles([
          { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
          { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' },
        ]);
      })
      .catch(() => setFiles([
        { _id: 'mock-1', name: 'Machine Learning Concepts', type: 'note' },
        { _id: 'mock-2', name: 'Biology Lecture 5', type: 'pdf' },
      ]));
  }, []);

  // Assign stable colours to nodes
  const colourisedGraph = useCallback((data: GraphData): GraphData => ({
    nodes: data.nodes.map(n => ({ ...n, color: hashColor(n.label) })),
    links: data.links,
  }), []);

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsGenerating(true); setGraphData(null); setIsSaved(false); setError(''); setSelectedNode(null);
    try {
      const getRes = await fetch(`http://localhost:5000/api/graphs/${selectedFile}`);
      if (getRes.ok) {
        const d = await getRes.json();
        setGraphData(colourisedGraph({ nodes: d.nodes, links: d.links }));
        setIsSaved(true); setIsGenerating(false); return;
      }
      const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';
      const genRes = await fetch('http://localhost:5000/api/graphs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-model-name': llmModel },
        body: JSON.stringify({ documentId: selectedFile }),
      });
      if (!genRes.ok) throw new Error('Failed to generate graph via AI');
      const genData = await genRes.json();
      setGraphData(colourisedGraph(genData));
    } catch (err: any) {
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
        body: JSON.stringify({ documentId: selectedFile, nodes: graphData.nodes, links: graphData.links }),
      });
      if (res.ok) setIsSaved(true);
    } catch { /* silent */ } finally { setIsSaving(false); }
  };

  const clearGraph = () => {
    setGraphData(null); setSelectedFile(''); setSelectedFileName('');
    setIsSaved(false); setError(''); setSelectedNode(null);
  };

  // Export PNG using the underlying canvas
  const handleExport = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${selectedFileName || 'knowledge-graph'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Derive node-type legend from graph
  const nodeTypeLegend = graphData
    ? Object.entries(
        graphData.nodes.reduce<Record<string, { color: string; count: number }>>((acc, n) => {
          const t = nodeType(n.label);
          if (!acc[t]) acc[t] = { color: n.color || '#6366f1', count: 0 };
          acc[t].count++;
          return acc;
        }, {})
      )
    : [];

  // Connections of the selected node
  const selectedConnections = selectedNode && graphData
    ? graphData.links.filter(l => {
        const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return src === selectedNode.id || tgt === selectedNode.id;
      }).map(l => {
        const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
        const otherId = src === selectedNode.id ? tgt : src;
        const other = graphData.nodes.find(n => n.id === otherId);
        return { label: other?.label || otherId, color: other?.color || '#6366f1' };
      })
    : [];

  // Canvas draw callback — always-visible labels + selected ring
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const radius = Math.sqrt(node.val || 4) * 4;
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;

      // Selection ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (isSelected ? 5 : 3), 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? `${node.color}44` : `${node.color}22`;
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color || '#6366f1';
      ctx.fill();

      // Label — always visible when showLabels, else only on hover/select
      if (showLabels || isSelected || isHovered) {
        const label = node.label as string;
        const fontSize = Math.max(10, 13 / globalScale);
        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pill background
        const textWidth = ctx.measureText(label).width;
        const padding = 4 / globalScale;
        const pillH = fontSize + padding * 2;
        const pillW = textWidth + padding * 4;
        const pillY = node.y + radius + 8 / globalScale;

        ctx.fillStyle = isSelected ? '#1e1b4b' : 'rgba(15,15,20,0.78)';
        ctx.beginPath();
        ctx.roundRect(node.x - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
        ctx.fill();

        ctx.fillStyle = isSelected ? '#a5b4fc' : '#e5e7eb';
        ctx.fillText(label, node.x, pillY);
      }
    },
    [showLabels, selectedNode, hoveredNode]
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('tools')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Knowledge Graph</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {graphData
                ? `${graphData.nodes.length} nodes · ${graphData.links.length} connections`
                : 'Map relationships between concepts visually'}
            </p>
          </div>
        </div>

        {graphData && (
          <div className="flex items-center gap-2">
            {/* Export PNG */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export PNG
            </button>
            {/* Save */}
            <button
              onClick={handleSaveGraph}
              disabled={isSaving || isSaved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isSaved
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save'}
            </button>
            {/* New Graph */}
            <button
              onClick={clearGraph}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" /> New Graph
            </button>
          </div>
        )}
      </div>

      {/* ── Body (Left sidebar + Canvas + Right sidebar) ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left Sidebar ── */}
        <div className="w-56 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Document selector */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">
                Source Document
              </label>
              <select
                value={selectedFile}
                onChange={e => {
                  setSelectedFile(e.target.value);
                  setSelectedFileName(files.find(f => f._id === e.target.value)?.name || '');
                  setGraphData(null); setIsSaved(false); setError(''); setSelectedNode(null);
                }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
              >
                <option value="">Select a document...</option>
                {files.map(f => <option key={f._id} value={f._id}>{f.name} ({f.type})</option>)}
              </select>
            </div>

            {/* Info card */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">How it works</p>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 leading-relaxed">
                AI extracts key concepts and maps the relationships between them into a visual graph.
              </p>
            </div>

            {/* Stats */}
            {graphData && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                {[['Nodes', graphData.nodes.length], ['Connections', graphData.links.length]].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">{k}</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">Document</span>
                  <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[90px]">{selectedFileName}</span>
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedFile || isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              {isGenerating
                ? <><BrainCircuit className="w-4 h-4 animate-pulse" /> Mapping...</>
                : <><Zap className="w-4 h-4" /> Generate Graph</>}
            </button>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Canvas Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">

          {/* Empty state */}
          {!isGenerating && !graphData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
                <Network className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">No graph yet</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                  Select a document and click Generate to visualise concept relationships
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
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

          {/* Graph */}
          {graphData && !isGenerating && (
            <div className="flex-1 overflow-hidden relative" ref={containerRef}>
              {/* dot-grid bg */}
              <div
                className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              />
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="transparent"
                nodeAutoColorBy="id"
                nodeRelSize={6}
                linkColor={() => 'rgba(148,163,184,0.35)'}
                linkWidth={1.5}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => 'rgba(99,102,241,0.7)'}
                nodeCanvasObject={nodeCanvasObject}
                nodeCanvasObjectMode={() => 'replace'}
                onNodeClick={(node: any) => {
                  setSelectedNode(prev => prev?.id === node.id ? null : node as GraphNode);
                }}
                onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
                cooldownTicks={120}
              />
            </div>
          )}
        </div>

        {/* ── Right Sidebar (Graph Settings + Selected Node) ── */}
        {graphData && !isGenerating && (
          <div className="w-56 border-l border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
            <div className="p-4 space-y-5">

              {/* Graph Settings */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
                  Graph Settings
                </p>
                {/* Show Labels toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">Show labels</span>
                  <button
                    onClick={() => setShowLabels(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${showLabels ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showLabels ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              {/* Node Types */}
              {nodeTypeLegend.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">
                    Node Types
                  </p>
                  <div className="space-y-1.5">
                    {nodeTypeLegend.map(([type, { color, count }]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-[88px]">{type}</span>
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Node */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">
                  Selected Node
                </p>
                {selectedNode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} />
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{selectedNode.label}</span>
                    </div>
                    <div className="px-0.5">
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1.5">
                        Connections ({selectedConnections.length})
                      </p>
                      <div className="space-y-1">
                        {selectedConnections.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{c.label}</span>
                          </div>
                        ))}
                        {selectedConnections.length === 0 && (
                          <p className="text-xs text-neutral-400 italic">No connections</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">Click a node to inspect it</p>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KgGeneratorWorkspace;