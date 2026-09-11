import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Sparkles, Lightbulb, Check, Copy, Clock,
  BrainCircuit, AlertCircle, ChevronRight
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ConceptExplainerWorkspaceProps {
  onNavigate?: (view: string) => void;
}

type DepthLevel = 'layperson' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

const depthConfig: Record<DepthLevel, { label: string; sub: string; apiValue: string }> = {
  layperson: { label: 'Layperson', sub: 'No prior knowledge', apiValue: 'feynman' },
  beginner: { label: 'Beginner', sub: 'Basic concepts only', apiValue: 'beginner' },
  intermediate: { label: 'Intermediate', sub: 'Some ML background', apiValue: 'beginner' },
  advanced: { label: 'Advanced', sub: 'Technical proficiency', apiValue: 'expert' },
  expert: { label: 'Expert', sub: 'Research-level', apiValue: 'expert' },
};

const ConceptExplainerWorkspace: React.FC<ConceptExplainerWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [depthLevel, setDepthLevel] = useState<DepthLevel>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [resultTitle, setResultTitle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
      })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleExplain = async () => {
    if (!selectedFile && !customTopic.trim()) {
      setError('Please select a document or enter a topic to explain.');
      return;
    }

    setError('');
    setResult('');
    setResultTitle('');
    setFollowUpQuestions([]);
    setGenerationTime(null);
    setIsGenerating(true);

    const startTime = Date.now();
    const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';

    try {
      const res = await fetch('http://localhost:5000/api/tools/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model-name': llmModel,
        },
        body: JSON.stringify({
          documentId: selectedFile || undefined,
          topic: customTopic.trim() || undefined,
          depth: depthConfig[depthLevel].apiValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate explanation');

      setResult(data.result);
      setResultTitle(customTopic.trim() || files.find(f => f._id === selectedFile)?.name || 'Concept');
      setGenerationTime((Date.now() - startTime) / 1000);

      // Extract potential follow-up questions from result
      const questionMatches = data.result.match(/\?[^.!?]*\n/g) || [];
      const suggestedQuestions = [
        'How does this work in practice?',
        'What are the key limitations?',
        'Can you give a real-world example?',
        'What are related concepts?',
      ];
      setFollowUpQuestions(suggestedQuestions);
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

  const handleFollowUp = (q: string) => {
    setCustomTopic(q);
    setSelectedFile('');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <button
          onClick={() => onNavigate?.('tools')}
          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Concept Explainer</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Feynman Technique — understand anything at any depth</p>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Sidebar — Controls */}
        <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0">
          <div className="p-4 space-y-5">
            
            {/* Concept / Topic Input */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">
                Concept or Topic
              </label>
              <textarea
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="e.g. Self-Attention mechanism in Transformers"
                rows={4}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none transition-all"
              />
            </div>

            {/* Or Select from Document */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">
                Or From Document
              </label>
              <select
                value={selectedFile}
                onChange={e => { setSelectedFile(e.target.value); if (e.target.value) setCustomTopic(''); }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              >
                <option value="">Select a document...</option>
                {files.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Explanation Depth */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">
                Explanation Depth
              </label>
              <div className="space-y-1">
                {(Object.keys(depthConfig) as DepthLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setDepthLevel(level)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      depthLevel === level
                        ? 'bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border border-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      depthLevel === level ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium leading-none ${
                        depthLevel === level
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {depthConfig[level].label}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                        {depthConfig[level].sub}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Explain Button */}
            <button
              onClick={handleExplain}
              disabled={(!selectedFile && !customTopic.trim()) || isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              {isGenerating ? (
                <><BrainCircuit className="w-4 h-4 animate-pulse" /> Thinking...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Explain</>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel — Explanation Output */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {error && (
            <div className="m-4 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7 text-blue-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Crafting your explanation...</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Using the Feynman Technique at {depthConfig[depthLevel].label} level</p>
              </div>
            </div>
          )}

          {!isGenerating && !result && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-neutral-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">Ready to explain</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                  Enter a concept or select a document, choose your depth level, and click Explain
                </p>
              </div>
            </div>
          )}

          {result && !isGenerating && (
            <div className="flex-1 overflow-y-auto">
              {/* Result Header */}
              <div className="px-6 pt-5 pb-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {depthConfig[depthLevel].label.toUpperCase()} LEVEL
                  </span>
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    For someone with {depthConfig[depthLevel].sub.toLowerCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{resultTitle}</h2>
                <div className="h-0.5 w-12 bg-blue-500 rounded-full mb-5" />
              </div>

              {/* Result Body */}
              <div className="px-6 pb-6">
                <MarkdownRenderer content={result} />

                {/* Generation time + Copy */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  {generationTime && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Clock className="w-3 h-3" />
                      Generated in {generationTime.toFixed(1)}s
                    </div>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-auto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Follow-up Questions */}
                {followUpQuestions.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-3">
                      Explore Further
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {followUpQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleFollowUp(q)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {q}
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptExplainerWorkspace;
