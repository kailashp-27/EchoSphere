import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Layers, FileText, BrainCircuit, Sparkles,
  ChevronLeft, ChevronRight, RotateCcw, Download, Check,
  AlertCircle, Clock, Shuffle, RotateCw
} from 'lucide-react';

interface FlashcardGeneratorWorkspaceProps {
  onNavigate?: (view: string) => void;
}

interface Flashcard {
  front: string;
  back: string;
}

type Difficulty = 'easy' | 'mixed' | 'hard';

const difficultyConfig: Record<Difficulty, { label: string; sub: string; color: string; dot: string }> = {
  easy: { label: 'Easy', sub: 'Key terms & recall', color: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  mixed: { label: 'Mixed', sub: 'Balanced questions', color: 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  hard: { label: 'Hard', sub: 'Conceptual & applied', color: 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const FlashcardGeneratorWorkspace: React.FC<FlashcardGeneratorWorkspaceProps> = ({ onNavigate }) => {
  const [files, setFiles] = useState<{ _id: string; name: string; type: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [cardCount, setCardCount] = useState('10');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');

  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState<number | null>(null);

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
        headers: { 'Content-Type': 'application/json', 'x-model-name': llmModel },
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

  const goNext = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex(i => Math.min(i + 1, flashcards.length - 1)), 150); };
  const goPrev = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 150); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f); }
  };

  const toggleMastered = () => {
    setMastered(prev => { const next = new Set(prev); if (next.has(currentIndex)) next.delete(currentIndex); else next.add(currentIndex); return next; });
  };

  const shuffle = () => {
    setFlashcards([...flashcards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0); setIsFlipped(false); setMastered(new Set());
  };

  const exportCards = () => {
    const text = flashcards.map((c, i) => `Q${i + 1}: ${c.front}\nA: ${c.back}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'flashcards.txt'; a.click(); URL.revokeObjectURL(url);
  };

  const resetSession = () => { setFlashcards([]); setCurrentIndex(0); setIsFlipped(false); setMastered(new Set()); setGenerationTime(null); setError(''); };

  const progress = flashcards.length ? Math.round((mastered.size / flashcards.length) * 100) : 0;
  const currentCard = flashcards[currentIndex];
  const isMastered = mastered.has(currentIndex);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500" onKeyDown={handleKeyDown} tabIndex={0}>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate?.('tools')} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Flashcard Generator</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {flashcards.length > 0 ? `${selectedFileName} · ${flashcards.length} cards` : 'AI-powered study cards from any document'}
            </p>
          </div>
        </div>
        {flashcards.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={shuffle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Shuffle className="w-3.5 h-3.5" /> Shuffle
            </button>
            <button onClick={exportCards} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={resetSession} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-medium text-white transition-colors">
              <RotateCw className="w-3.5 h-3.5" /> New Set
            </button>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left Sidebar — Config */}
        <div className="w-60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* Document */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Document</label>
              <select
                value={selectedFile}
                onChange={e => {
                  setSelectedFile(e.target.value);
                  setSelectedFileName(files.find(f => f._id === e.target.value)?.name || '');
                  setError('');
                }}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              >
                <option value="">Select a document...</option>
                {files.map(f => <option key={f._id} value={f._id}>{f.name} ({f.type})</option>)}
              </select>
            </div>

            {/* Card Count */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Number of Cards</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['5', '10', '15', '20'].map(n => (
                  <button key={n} onClick={() => setCardCount(n)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${cardCount === n ? 'bg-purple-600 text-white shadow-sm' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-purple-300 dark:hover:border-purple-600'}`}
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all ${difficulty === d ? difficultyConfig[d].color + ' border-opacity-100' : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60'}`}
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

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedFile || isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              {isGenerating ? <><BrainCircuit className="w-4 h-4 animate-pulse" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Cards</>}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Study Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {!isGenerating && flashcards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center">
                <Layers className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">Ready to generate</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">Pick a document and configure your card settings, then click Generate</p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7 text-purple-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Crafting your flashcards...</p>
                <p className="text-xs text-neutral-500 mt-1">Generating {cardCount} {difficultyConfig[difficulty].label.toLowerCase()} cards</p>
              </div>
            </div>
          )}

          {flashcards.length > 0 && !isGenerating && (
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* Center — Card Viewer */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 overflow-y-auto">

                {/* Stats Row */}
                <div className="flex items-center gap-4 w-full max-w-lg">
                  <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0 font-medium">{mastered.size}/{flashcards.length} mastered</span>
                  {generationTime && (
                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="w-3 h-3" />{generationTime.toFixed(1)}s
                    </div>
                  )}
                </div>

                {/* Flip Card */}
                <div className="w-full max-w-lg cursor-pointer select-none" style={{ perspective: '1200px' }} onClick={() => setIsFlipped(f => !f)}>
                  <div className="relative w-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '220px' }}>
                    {/* Front */}
                    <div className="absolute inset-0 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-8 shadow-md" style={{ backfaceVisibility: 'hidden' }}>
                      {isMastered && (
                        <span className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                          <Check className="w-3 h-3" /> Mastered
                        </span>
                      )}
                      <span className="absolute top-4 left-4 text-[11px] font-bold text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/30 uppercase tracking-wider">
                        Question
                      </span>
                      <p className="text-xl font-semibold text-neutral-900 dark:text-white text-center leading-relaxed mt-4">{currentCard?.front}</p>
                      <div className="absolute bottom-4 flex items-center gap-2">
                        <RotateCw className="w-3 h-3 text-neutral-400" />
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">Click or press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded font-mono text-[10px]">Space</kbd> to flip</p>
                      </div>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 rounded-2xl border border-purple-200 dark:border-purple-500/40 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-neutral-950 flex flex-col items-center justify-center p-8 shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <span className="absolute top-4 left-4 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/15 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/40 uppercase tracking-wider">Answer</span>
                      <p className="text-lg text-neutral-800 dark:text-neutral-200 text-center leading-relaxed mt-4">{currentCard?.back}</p>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 w-full max-w-lg justify-between">
                  <button onClick={goPrev} disabled={currentIndex === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{currentIndex + 1} / {flashcards.length}</span>
                    <button onClick={toggleMastered} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isMastered ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'}`}>
                      <Check className="w-3 h-3" />{isMastered ? 'Mastered ✓' : 'Mark Mastered'}
                    </button>
                  </div>
                  <button onClick={goNext} disabled={currentIndex === flashcards.length - 1} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">←</kbd> <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">→</kbd> to navigate &bull; <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Space</kbd> to flip
                </p>

                {mastered.size === flashcards.length && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl animate-in slide-in-from-bottom-4 duration-500 w-full max-w-lg">
                    <span className="text-2xl">🎉</span>
                    <div className="flex-1">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">All {flashcards.length} cards mastered!</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Try a harder difficulty or new document.</p>
                    </div>
                    <button onClick={resetSession} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" /> New Set
                    </button>
                  </div>
                )}
              </div>

              {/* Right — Card List */}
              <div className="w-56 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 overflow-y-auto shrink-0">
                <div className="px-3 pt-4 pb-2">
                  <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-widest">All Cards</p>
                </div>
                <div className="px-2 pb-4 space-y-1">
                  {flashcards.map((card, idx) => (
                    <button key={idx} onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center gap-2.5
                        ${currentIndex === idx ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10'
                          : mastered.has(idx) ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5'
                          : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60'}`}
                    >
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentIndex === idx ? 'bg-purple-500 text-white' : mastered.has(idx) ? 'bg-emerald-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                        {mastered.has(idx) ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                      </span>
                      <span className={`text-xs truncate ${currentIndex === idx ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-neutral-600 dark:text-neutral-400'}`}>{card.front}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardGeneratorWorkspace;
