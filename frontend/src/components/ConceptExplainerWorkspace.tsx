import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Lightbulb, Check, Copy, Clock, BrainCircuit, FileText } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface ConceptExplainerWorkspaceProps {
  onNavigate?: (view: string) => void;
}

const ConceptExplainerWorkspace: React.FC<ConceptExplainerWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{_id: string, name: string, type: string}[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [explanationDepth, setExplanationDepth] = useState<string>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
      })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleExplain = async () => {
    if (!selectedFile) {
      setError('Please select a file to explain.');
      return;
    }
    
    setError('');
    setResult('');
    setGenerationTime(null);
    setIsGenerating(true);
    
    const startTime = Date.now();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const llmModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

    try {
      const res = await fetch('http://localhost:5000/api/tools/explain', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-model-name': llmModel
        },
        body: JSON.stringify({ documentId: selectedFile, depth: explanationDepth })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate explanation');
      }

      setResult(data.result);
      setGenerationTime((Date.now() - startTime) / 1000);
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
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Concept Explainer
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">
                Break down complex topics into easy-to-understand explanations.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Source Document</label>
                <CustomSelect
                  value={selectedFile}
                  onChange={setSelectedFile}
                  placeholder="Select a document to explain"
                  icon={<FileText className="w-4 h-4" />}
                  options={files.map(f => ({ value: f._id, label: `${f.name} (${f.type})` }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Explanation Depth</label>
                <CustomSelect
                  value={explanationDepth}
                  onChange={setExplanationDepth}
                  placeholder="Choose depth"
                  options={[
                    { value: 'beginner', label: 'Simple & Beginner Friendly' },
                    { value: 'feynman', label: 'Feynman Technique (Like teaching a child)' },
                    { value: 'expert', label: 'Advanced & Technical' },
                  ]}
                />
              </div>
            </div>

            <button
              onClick={handleExplain}
              disabled={!selectedFile || isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <BrainCircuit className="w-5 h-5 animate-pulse" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Explain Concept
                </>
              )}
            </button>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </div>

          {result && (
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Explanation generated in {generationTime?.toFixed(2)} seconds</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="text-sm">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="prose dark:prose-invert max-w-none font-medium leading-relaxed whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptExplainerWorkspace;
