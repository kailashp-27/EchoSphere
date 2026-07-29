import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Layers, FileText, BrainCircuit, Sparkles,
  ChevronLeft, ChevronRight, RotateCcw, Download, Check,
  AlertCircle, Clock, Shuffle
} from 'lucide-react';
import CustomSelect from './CustomSelect';

interface FlashcardGeneratorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

interface Flashcard {
  front: string;
  back: string;
}

const FlashcardGeneratorWorkspace: React.FC<FlashcardGeneratorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [cardCount, setCardCount] = useState('10');
  const [difficulty, setDifficulty] = useState('mixed');

  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  // Card viewer state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => { if (data.files) setFiles(data.files); })
      .catch(err => console.error('Error fetching files:', err));
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) { setError('Please select a document first.'); return; }
    setError('');
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMastered(new Set());
    setIsGenerating(true);
    const startTime = Date.now();
    const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';

    try {
      const res = await fetch('http://localhost:5000/api/tools/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model-name': llmModel,
        },
        body: JSON.stringify({ documentId: selectedFile, count: parseInt(cardCount), difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');
      setFlashcards(data.flashcards);
      setGenerationTime((Date.now() - startTime) / 1000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const goNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.min(i + 1, flashcards.length - 1)), 150);
  };

  const goPrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f); }
  };

  const toggleMastered = () => {
    setMastered(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const shuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMastered(new Set());
  };

  const exportCards = () => {
    const text = flashcards.map((c, i) => `Q${i + 1}: ${c.front}\nA: ${c.back}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSession = () => {
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMastered(new Set());
    setGenerationTime(null);
    setError('');
  };

  const progress = flashcards.length ? Math.round((mastered.size / flashcards.length) * 100) : 0;
  const currentCard = flashcards[currentIndex];
  const isMastered = mastered.has(currentIndex);

  return (
    <div
      className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => onNavigate?.('tools')}
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Flashcard Generator</h2>
            <p className="text-neutral-500 dark:text-neutral-400">AI-powered study cards from any document.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

          {/* Config Panel */}
          {flashcards.length === 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div className="md:col-span-1 flex flex-col gap-2">
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
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Number of Cards</label>
                  <CustomSelect
                    value={cardCount}
                    onChange={setCardCount}
                    placeholder="How many?"
                    options={[
                      { value: '5', label: '5 Cards — Quick Review' },
                      { value: '10', label: '10 Cards — Standard' },
                      { value: '15', label: '15 Cards — Comprehensive' },
                      { value: '20', label: '20 Cards — Deep Dive' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Difficulty Level</label>
                  <CustomSelect
                    value={difficulty}
                    onChange={setDifficulty}
                    placeholder="Choose difficulty"
                    options={[
                      { value: 'easy', label: '🟢 Easy — Key Terms & Recall' },
                      { value: 'mixed', label: '🟡 Mixed — Balanced Questions' },
                      { value: 'hard', label: '🔴 Hard — Conceptual & Applied' },
                    ]}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedFile || isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <><BrainCircuit className="w-5 h-5 animate-pulse" /> AI is creating your flashcards...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Flashcards</>
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
          {flashcards.length > 0 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-500">

              {/* Stats Bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    <Clock className="w-4 h-4" />
                    <span>Generated in {generationTime?.toFixed(1)}s</span>
                  </div>
                  <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {mastered.size}/{flashcards.length} mastered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={shuffle} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    <Shuffle className="w-3.5 h-3.5" /> Shuffle
                  </button>
                  <button onClick={exportCards} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button onClick={resetSession} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> New Set
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <span>Mastery Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Flip Card */}
              <div className="flex flex-col items-center gap-5">
                {/* Card */}
                <div
                  className="w-full cursor-pointer select-none"
                  style={{ perspective: '1200px' }}
                  onClick={() => setIsFlipped(f => !f)}
                >
                  <div
                    className="relative w-full transition-transform duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      minHeight: '240px',
                    }}
                  >
                    {/* Front */}
                    <div
                      className="absolute inset-0 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-8 shadow-md"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {isMastered && (
                        <span className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                          <Check className="w-3 h-3" /> Mastered
                        </span>
                      )}
                      <span className="absolute top-4 left-4 text-xs font-semibold text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                        Question
                      </span>
                      <p className="text-xl font-semibold text-neutral-900 dark:text-white text-center leading-relaxed mt-4">
                        {currentCard?.front}
                      </p>
                      <p className="absolute bottom-4 text-xs text-neutral-400 dark:text-neutral-500">
                        Click card or press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded font-mono text-[10px]">Space</kbd> to flip
                      </p>
                    </div>

                    {/* Back */}
                    <div
                      className="absolute inset-0 rounded-2xl border border-purple-200 dark:border-purple-500/40 bg-purple-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8 shadow-md"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <span className="absolute top-4 left-4 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-300 dark:border-purple-500/40">
                        Answer
                      </span>
                      <p className="text-lg text-neutral-800 dark:text-neutral-200 text-center leading-relaxed mt-4">
                        {currentCard?.back}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center gap-4 w-full justify-between">
                  {/* Prev */}
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  {/* Counter + Mastered Toggle */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {currentIndex + 1} / {flashcards.length}
                    </span>
                    <button
                      onClick={toggleMastered}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isMastered
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      {isMastered ? 'Mastered ✓' : 'Mark as Mastered'}
                    </button>
                  </div>

                  {/* Next */}
                  <button
                    onClick={goNext}
                    disabled={currentIndex === flashcards.length - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Use <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">←</kbd> <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">→</kbd> to navigate &bull; <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Space</kbd> to flip
                </p>
              </div>

              {/* Card Strip / All Cards Preview */}
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3 uppercase tracking-wider">All Cards</h3>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {flashcards.map((card, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-start gap-3
                        ${currentIndex === idx
                          ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                          : mastered.has(idx)
                            ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                            : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900/50'
                        }`}
                    >
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${currentIndex === idx ? 'bg-purple-500 text-white' : mastered.has(idx) ? 'bg-emerald-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                        {mastered.has(idx) ? <Check className="w-3 h-3" /> : idx + 1}
                      </span>
                      <span className={`truncate ${currentIndex === idx ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {card.front}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Completion Banner */}
              {mastered.size === flashcards.length && (
                <div className="flex items-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl animate-in slide-in-from-bottom-4 duration-500">
                  <div className="text-2xl">🎉</div>
                  <div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">You've mastered all {flashcards.length} cards!</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-0.5">Great work — try generating a harder set or a new document.</p>
                  </div>
                  <button onClick={resetSession} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors shrink-0">
                    <RotateCcw className="w-4 h-4" /> New Set
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardGeneratorWorkspace;
