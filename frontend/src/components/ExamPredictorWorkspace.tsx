import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LineChart, FileText, BrainCircuit, Sparkles,
  ChevronDown, ChevronUp, Download, Check, AlertCircle,
  Clock, RotateCw, BookOpen, Target, Hash
} from 'lucide-react';

interface ExamPredictorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

interface ExamQuestion {
  question: string;
  type: 'mcq' | 'short-answer' | 'essay';
  options?: string[];
  answer: string;
  explanation: string;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type QType = 'mixed' | 'mcq' | 'short-answer' | 'essay';

const difficultyConfig: Record<Difficulty, { label: string; sub: string; dot: string; active: string }> = {
  easy: { label: 'Easy', sub: 'Basic recall', dot: 'bg-emerald-500', active: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300' },
  medium: { label: 'Medium', sub: 'Standard exam', dot: 'bg-amber-500', active: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300' },
  hard: { label: 'Hard', sub: 'Deep conceptual', dot: 'bg-red-500', active: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300' },
};

const qtypeConfig: Record<QType, { label: string; icon: React.ReactNode }> = {
  mixed: { label: 'Mixed Types', icon: <Hash className="w-3.5 h-3.5" /> },
  mcq: { label: 'MCQ Only', icon: <Target className="w-3.5 h-3.5" /> },
  'short-answer': { label: 'Short Answer', icon: <BookOpen className="w-3.5 h-3.5" /> },
  essay: { label: 'Essay', icon: <FileText className="w-3.5 h-3.5" /> },
};

const ExamPredictorWorkspace: React.FC<ExamPredictorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionType, setQuestionType] = useState<QType>('mixed');

  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => { if (data.files) setFiles(data.files); })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) { setError('Please select a document first.'); return; }
    setError(''); setQuestions([]); setRevealedAnswers(new Set()); setSelectedOptions({});
    setIsGenerating(true);
    const startTime = Date.now();
    const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';
    try {
      const res = await fetch('http://localhost:5000/api/tools/exam-predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-model-name': llmModel },
        body: JSON.stringify({ documentId: selectedFile, count: parseInt(questionCount), difficulty, type: questionType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam questions');
      setQuestions(data.questions);
      setGenerationTime((Date.now() - startTime) / 1000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleReveal = (idx: number) => {
    setRevealedAnswers(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  };

  const handleOptionSelect = (qIdx: number, optIdx: number) => {
    if (revealedAnswers.has(qIdx)) return;
    setSelectedOptions(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const exportExam = () => {
    const text = questions.map((q, i) => {
      let t = `Q${i + 1} (${q.type.toUpperCase()}): ${q.question}\n`;
      if (q.type === 'mcq' && q.options) q.options.forEach((opt, idx) => { t += `  ${String.fromCharCode(65 + idx)}. ${opt}\n`; });
      t += `\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`;
      return t;
    }).join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'practice_exam.txt'; a.click(); URL.revokeObjectURL(url);
  };

  const resetSession = () => { setQuestions([]); setRevealedAnswers(new Set()); setSelectedOptions({}); setGenerationTime(null); setError(''); };

  const revealedCount = revealedAnswers.size;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate?.('tools')} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Exam Predictor</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {questions.length > 0 ? `${questions.length} questions · ${revealedCount} revealed` : 'Generate predicted exam questions from your notes'}
            </p>
          </div>
        </div>
        {questions.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={exportExam} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={resetSession} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-medium text-white transition-colors">
              <RotateCw className="w-3.5 h-3.5" /> New Exam
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left Sidebar */}
        <div className="w-60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* Document */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Source Document</label>
              <select
                value={selectedFile}
                onChange={e => { setSelectedFile(e.target.value); setSelectedFileName(files.find(f => f._id === e.target.value)?.name || ''); setError(''); }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition-all"
              >
                <option value="">Select a document...</option>
                {files.map(f => <option key={f._id} value={f._id}>{f.name} ({f.type})</option>)}
              </select>
            </div>

            {/* Question Count */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Questions</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['5', '10', '20'].map(n => (
                  <button key={n} onClick={() => setQuestionCount(n)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${questionCount === n ? 'bg-rose-600 text-white shadow-sm' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-rose-300 dark:hover:border-rose-600'}`}
                  >{n}</button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Difficulty</label>
              <div className="space-y-1.5">
                {(Object.keys(difficultyConfig) as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all ${difficulty === d ? difficultyConfig[d].active : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60'}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${difficultyConfig[d].dot}`} />
                    <div>
                      <p className={`text-sm font-medium leading-none ${difficulty === d ? '' : 'text-neutral-700 dark:text-neutral-300'}`}>{difficultyConfig[d].label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">{difficultyConfig[d].sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Question Type</label>
              <div className="space-y-1">
                {(Object.keys(qtypeConfig) as QType[]).map(qt => (
                  <button key={qt} onClick={() => setQuestionType(qt)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left border transition-all text-sm ${questionType === qt ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'}`}
                  >
                    {qtypeConfig[qt].icon}
                    {qtypeConfig[qt].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button onClick={handleGenerate} disabled={!selectedFile || isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              {isGenerating ? <><BrainCircuit className="w-4 h-4 animate-pulse" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Exam</>}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Questions */}
        <div className="flex-1 overflow-y-auto">
          {!isGenerating && questions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center">
                <LineChart className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">Ready to predict</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">Configure your exam settings in the sidebar and click Generate to create practice questions</p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7 text-rose-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Analysing document...</p>
                <p className="text-xs text-neutral-500 mt-1">Generating {questionCount} {difficultyConfig[difficulty].label.toLowerCase()} questions</p>
              </div>
            </div>
          )}

          {questions.length > 0 && !isGenerating && (
            <div className="p-5 space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 pb-1">
                {generationTime && <><Clock className="w-3.5 h-3.5" /><span>{generationTime.toFixed(1)}s</span><span className="text-neutral-300 dark:text-neutral-700">|</span></>}
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{questions.length} Questions</span>
                <span className="text-neutral-300 dark:text-neutral-700">|</span>
                <span>{revealedCount} of {questions.length} revealed</span>
              </div>

              {/* Question Cards */}
              {questions.map((q, idx) => {
                const isRevealed = revealedAnswers.has(idx);
                const isMCQ = q.type === 'mcq' && q.options && q.options.length > 0;
                const typeBadgeColor = q.type === 'mcq' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20'
                  : q.type === 'essay' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20';

                return (
                  <div key={idx} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold shrink-0 mt-0.5 text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${typeBadgeColor}`}>
                              {q.type === 'short-answer' ? 'Short Answer' : q.type.toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white leading-relaxed mb-3">{q.question}</h3>

                          {isMCQ && (
                            <div className="flex flex-col gap-2 mb-3">
                              {q.options!.map((opt, optIdx) => {
                                const isSelected = selectedOptions[idx] === optIdx;
                                let cls = 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300';
                                if (isSelected) cls = 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';
                                if (isRevealed) {
                                  const isCorrect = q.answer.includes(opt) || q.answer.includes(String.fromCharCode(65 + optIdx));
                                  if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
                                  else if (isSelected && !isCorrect) cls = 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
                                  else cls = 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 opacity-50 text-neutral-500';
                                }
                                return (
                                  <button key={optIdx} onClick={() => handleOptionSelect(idx, optIdx)} disabled={isRevealed}
                                    className={`flex items-start text-left gap-2.5 w-full p-2.5 rounded-xl border transition-all text-sm ${cls} ${isRevealed ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <span className="font-semibold w-5 shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                    <span>{opt}</span>
                                    {isRevealed && (q.answer.includes(opt) || q.answer.includes(String.fromCharCode(65 + optIdx))) && (
                                      <Check className="w-4 h-4 ml-auto shrink-0 text-emerald-600" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {!isMCQ && !isRevealed && (
                            <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-center text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                              Think about your answer, then reveal below.
                            </div>
                          )}

                          <button onClick={() => toggleReveal(idx)}
                            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors mt-1 ${isRevealed ? 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400' : 'text-rose-600 hover:text-rose-700 dark:text-rose-400'}`}
                          >
                            {isRevealed ? <><ChevronUp className="w-3.5 h-3.5" /> Hide Answer</> : <><ChevronDown className="w-3.5 h-3.5" /> Reveal Answer</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isRevealed && (
                      <div className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-5 animate-in slide-in-from-top-2 duration-300">
                        <div className="mb-3">
                          <span className="inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg mb-2">Correct Answer</span>
                          <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">{q.answer}</p>
                        </div>
                        {q.explanation && (
                          <div>
                            <span className="inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg mb-2">Explanation</span>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamPredictorWorkspace;
