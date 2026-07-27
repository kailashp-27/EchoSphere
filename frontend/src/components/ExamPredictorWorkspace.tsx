import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LineChart, FileText, BrainCircuit, Sparkles,
  ChevronDown, ChevronUp, Download, Check, AlertCircle, Clock, RotateCcw
} from 'lucide-react';
import CustomSelect from './CustomSelect';

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

const ExamPredictorWorkspace: React.FC<ExamPredictorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mixed');

  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  // State to track which question answers are revealed
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  // User's selected MCQ options (just for visual selection, not strictly graded)
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => { if (data.files) setFiles(data.files); })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) { setError('Please select a document first.'); return; }
    setError('');
    setQuestions([]);
    setRevealedAnswers(new Set());
    setSelectedOptions({});
    setIsGenerating(true);
    const startTime = Date.now();
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const llmModel = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

    try {
      const res = await fetch('http://localhost:5000/api/tools/exam-predictor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-model-name': llmModel,
        },
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

  const toggleReveal = (index: number) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleOptionSelect = (qIndex: number, optIndex: number) => {
    // Only allow selecting if not revealed yet (optional rule)
    if (revealedAnswers.has(qIndex)) return;
    
    setSelectedOptions(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const exportExam = () => {
    const text = questions.map((q, i) => {
      let qText = `Q${i + 1} (${q.type.toUpperCase()}): ${q.question}\n`;
      if (q.type === 'mcq' && q.options) {
        q.options.forEach((opt, idx) => {
          qText += `  ${String.fromCharCode(65 + idx)}. ${opt}\n`;
        });
      }
      qText += `\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`;
      return qText;
    }).join('\n----------------------------------------\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'practice_exam.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSession = () => {
    setQuestions([]);
    setRevealedAnswers(new Set());
    setSelectedOptions({});
    setGenerationTime(null);
    setError('');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => onNavigate?.('tools')}
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shadow-sm">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Exam Predictor</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Generate potential exam questions from your notes.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

          {/* Config Panel */}
          {questions.length === 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Source Document</label>
                  <CustomSelect
                    value={selectedFile}
                    onChange={(v) => { setSelectedFile(v); setError(''); }}
                    placeholder="Select a document"
                    icon={<FileText className="w-4 h-4" />}
                    options={files.map(f => ({ value: f._id, label: `${f.name} (${f.type})` }))}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Number of Questions</label>
                  <CustomSelect
                    value={questionCount}
                    onChange={setQuestionCount}
                    placeholder="How many?"
                    options={[
                      { value: '5', label: '5 Questions — Quick Quiz' },
                      { value: '10', label: '10 Questions — Short Test' },
                      { value: '20', label: '20 Questions — Full Exam' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Difficulty</label>
                  <CustomSelect
                    value={difficulty}
                    onChange={setDifficulty}
                    placeholder="Choose difficulty"
                    options={[
                      { value: 'easy', label: '🟢 Easy — Basic Recall' },
                      { value: 'medium', label: '🟡 Medium — Standard Exam' },
                      { value: 'hard', label: '🔴 Hard — Deep Conceptual' },
                    ]}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Question Types</label>
                  <CustomSelect
                    value={questionType}
                    onChange={setQuestionType}
                    placeholder="Choose type"
                    options={[
                      { value: 'mixed', label: '🔀 Mixed Types (MCQ & Short Answer)' },
                      { value: 'mcq', label: '🔘 Multiple Choice Only' },
                      { value: 'short-answer', label: '✍️ Short Answer Only' },
                      { value: 'essay', label: '📝 Essay Questions Only' },
                    ]}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedFile || isGenerating}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <><BrainCircuit className="w-5 h-5 animate-pulse" /> AI is generating your exam...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Exam</>
                )}
              </button>

              {error && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Results Area */}
          {questions.length > 0 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">

              {/* Action Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Clock className="w-4 h-4" />
                  <span>Generated in {generationTime?.toFixed(1)}s</span>
                  <span className="mx-2 text-neutral-300 dark:text-neutral-700">|</span>
                  <span className="font-semibold">{questions.length} Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportExam} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm">
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button onClick={resetSession} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    <RotateCcw className="w-4 h-4" /> New Exam
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const isRevealed = revealedAnswers.has(idx);
                  const isMCQ = q.type === 'mcq' && q.options && q.options.length > 0;
                  
                  return (
                    <div key={idx} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-neutral-900 dark:text-white leading-relaxed mb-4">
                              {q.question}
                            </h3>
                            
                            {/* MCQ Options */}
                            {isMCQ && (
                              <div className="flex flex-col gap-2 mb-4">
                                {q.options!.map((opt, optIdx) => {
                                  const isSelected = selectedOptions[idx] === optIdx;
                                  
                                  // Determine styling if revealed
                                  let optionClass = "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300";
                                  
                                  if (isSelected) {
                                    optionClass = "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300";
                                  }
                                  
                                  if (isRevealed) {
                                    const isCorrectOpt = q.answer.includes(opt) || q.answer.includes(String.fromCharCode(65 + optIdx));
                                    
                                    if (isCorrectOpt) {
                                      optionClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                                    } else if (isSelected && !isCorrectOpt) {
                                      optionClass = "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400";
                                    } else {
                                      optionClass = "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 opacity-60 text-neutral-500 dark:text-neutral-500";
                                    }
                                  }

                                  return (
                                    <button
                                      key={optIdx}
                                      onClick={() => handleOptionSelect(idx, optIdx)}
                                      disabled={isRevealed}
                                      className={`flex items-start text-left gap-3 w-full p-3 rounded-xl border transition-all ${optionClass} ${isRevealed ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                      <span className="font-semibold w-6 shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                      <span>{opt}</span>
                                      
                                      {isRevealed && isSelected && optionClass.includes('emerald') && (
                                        <Check className="w-5 h-5 ml-auto text-emerald-600" />
                                      )}
                                      {isRevealed && optionClass.includes('emerald') && !isSelected && (
                                        <Check className="w-5 h-5 ml-auto text-emerald-600" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {!isMCQ && !isRevealed && (
                              <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-xl p-4 text-center text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                Think about your answer, then click reveal below.
                              </div>
                            )}

                            {/* Reveal Button */}
                            <button
                              onClick={() => toggleReveal(idx)}
                              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors mt-2 ${
                                isRevealed 
                                  ? 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300' 
                                  : 'text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300'
                              }`}
                            >
                              {isRevealed ? <><ChevronUp className="w-4 h-4" /> Hide Answer</> : <><ChevronDown className="w-4 h-4" /> Reveal Answer</>}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Revealed Answer & Explanation */}
                      {isRevealed && (
                        <div className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-6 animate-in slide-in-from-top-2 duration-300">
                          <div className="mb-3">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg mb-2">
                              Correct Answer
                            </span>
                            <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                              {q.answer}
                            </p>
                          </div>
                          
                          {q.explanation && (
                            <div>
                              <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-lg mb-2">
                                Explanation
                              </span>
                              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamPredictorWorkspace;
