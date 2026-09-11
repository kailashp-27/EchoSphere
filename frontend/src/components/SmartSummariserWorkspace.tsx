import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Sparkles, FileText, Check, Copy, Clock,
  BrainCircuit, Download, BookOpen, Tag, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, BookMarked
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface SmartSummariserWorkspaceProps {
  onNavigate?: (view: string) => void;
}

type SummaryMode = 'brief' | 'standard' | 'detailed';

const SmartSummariserWorkspace: React.FC<SmartSummariserWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string; content?: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileData, setSelectedFileData] = useState<{ name: string; type: string; content?: string } | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [docPage, setDocPage] = useState(1);

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
      })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId);
    const f = files.find(x => x._id === fileId);
    setSelectedFileData(f || null);
    setResult('');
    setKeyConcepts([]);
    setError('');
    setGenerationTime(null);
    setDocPage(1);
  };

  const summaryLengthMap: Record<SummaryMode, string> = {
    brief: 'short',
    standard: 'medium',
    detailed: 'long',
  };

  const handleSummarise = async () => {
    if (!selectedFile) {
      setError('Please select a document first.');
      return;
    }
    setError('');
    setResult('');
    setKeyConcepts([]);
    setGenerationTime(null);
    setIsGenerating(true);

    const startTime = Date.now();
    const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';

    try {
      const res = await fetch('http://localhost:5000/api/tools/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model-name': llmModel,
        },
        body: JSON.stringify({ documentId: selectedFile, length: summaryLengthMap[summaryMode] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary');

      setResult(data.result);
      setGenerationTime((Date.now() - startTime) / 1000);

      // Extract key concepts (words after colons or bold-ish patterns)
      const conceptMatches = data.result.match(/\*\*([^*]+)\*\*/g) || [];
      const concepts = conceptMatches.slice(0, 6).map((m: string) => m.replace(/\*\*/g, '').trim());
      if (concepts.length > 0) setKeyConcepts(concepts);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contentLines = selectedFileData?.content?.split('\n').filter(Boolean) || [];
  const linesPerPage = 30;
  const totalPages = Math.max(1, Math.ceil(contentLines.length / linesPerPage));
  const pageContent = contentLines.slice((docPage - 1) * linesPerPage, docPage * linesPerPage).join('\n');

  const modeLabels: Record<SummaryMode, string> = {
    brief: 'Brief',
    standard: 'Standard',
    detailed: 'Detailed',
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('tools')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Smart Summariser</h1>
            {selectedFileData ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {selectedFileData.name} — {selectedFileData.type?.toUpperCase()}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Select a document to begin</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Export'}
            </button>
          )}
          <button
            onClick={handleSummarise}
            disabled={!selectedFile || isGenerating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> AI Summary</>
            )}
          </button>
        </div>
      </div>

      {/* File Selector Row */}
      <div className="px-5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Document</label>
          <select
            value={selectedFile}
            onChange={e => handleFileSelect(e.target.value)}
            className="flex-1 max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          >
            <option value="">Select a document...</option>
            {files.map(f => (
              <option key={f._id} value={f._id}>{f.name} ({f.type})</option>
            ))}
          </select>

          {result && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700 text-sm">|</span>
              <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Summary Type</label>
              <div className="flex rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                {(['brief', 'standard', 'detailed'] as SummaryMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSummaryMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      summaryMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {modeLabels[mode]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedFile ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Select a Document</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
            Choose a document from your knowledge base to generate an AI-powered summary
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Panel — Document Viewer */}
          <div className="w-[45%] border-r border-neutral-200 dark:border-neutral-800 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 shrink-0">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Document Viewer</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDocPage(p => Math.max(1, p - 1))}
                    disabled={docPage === 1}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{docPage} / {totalPages}</span>
                  <button
                    onClick={() => setDocPage(p => Math.min(totalPages, p + 1))}
                    disabled={docPage === totalPages}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedFileData?.type === 'pdf' ? (
                /* ── Inline PDF viewer ── */
                <iframe
                  key={selectedFileData._id}
                  src={`http://localhost:5000/api/knowledge/download/${selectedFileData._id}`}
                  className="w-full h-full border-0 rounded-b-xl"
                  title={selectedFileData.name}
                />
              ) : pageContent ? (
                /* ── Plain-text / note preview ── */
                <div className="h-full overflow-y-auto p-6">
                  <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                      {selectedFileData?.name}
                    </h2>
                    <pre className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {pageContent}
                    </pre>
                  </div>
                </div>
              ) : (
                /* ── Empty / unsupported fallback ── */
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedFileData?.type === 'docx'
                      ? 'DOCX preview is not yet supported'
                      : 'Select a document to preview it here'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel — AI Summary */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 shrink-0">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">AI Summary</span>
              {generationTime && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                  <Clock className="w-3 h-3" />
                  {generationTime.toFixed(1)}s
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <BrainCircuit className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">AI is reading your document...</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Generating {modeLabels[summaryMode].toLowerCase()} summary</p>
                  </div>
                </div>
              )}

              {!isGenerating && !result && !error && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Ready to summarise</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Click "AI Summary" in the toolbar to generate</p>
                  </div>
                  <button
                    onClick={handleSummarise}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> Generate Summary
                  </button>
                </div>
              )}

              {result && !isGenerating && (
                <>
                  {/* Key Concepts */}
                  {keyConcepts.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-2 duration-400">
                      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Key Concepts</p>
                      <div className="flex flex-wrap gap-2">
                        {keyConcepts.map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-500/20"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Label */}
                  <div className="animate-in slide-in-from-bottom-2 duration-500">
                    <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-3">
                      Summary — {modeLabels[summaryMode]}
                    </p>
                    <MarkdownRenderer content={result} />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 pb-1 animate-in slide-in-from-bottom-2 duration-600">
                    <button
                      onClick={() => onNavigate?.('concept-explainer')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <BookMarked className="w-3.5 h-3.5" /> Explain Concepts
                    </button>
                    <button
                      onClick={() => onNavigate?.('kg-generator')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5" /> Build Graph
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Save'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSummariserWorkspace;
