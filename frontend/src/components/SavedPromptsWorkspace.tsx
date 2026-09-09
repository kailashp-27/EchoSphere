import React, { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft, Copy, Check, Plus, X, Trash2, Search, Edit2, Tag } from 'lucide-react';

interface SavedPrompt {
  _id: string;
  title: string;
  prompt: string;
  category?: string;
  createdAt: string;
  usageCount?: number;
}

interface SavedPromptsWorkspaceProps {
  onNavigate?: (view: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Explain: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  Analysis: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  Math: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
  Study: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  Research: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  General: 'bg-neutral-100 dark:bg-neutral-700/40 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
};

const CATEGORY_DOT: Record<string, string> = {
  Explain: 'bg-blue-500',
  Analysis: 'bg-emerald-500',
  Math: 'bg-violet-500',
  Study: 'bg-amber-500',
  Research: 'bg-rose-500',
  General: 'bg-neutral-400',
};

const SavedPromptsWorkspace: React.FC<SavedPromptsWorkspaceProps> = ({ onNavigate }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/prompts')
      .then(res => res.json())
      .then(data => {
        setPrompts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch prompts', err);
        setLoading(false);
      });
  }, []);

  const handleDeletePrompt = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/prompts/${id}`, { method: 'DELETE' });
      if (res.ok) setPrompts(prompts.filter(p => p._id !== id));
    } catch (err) {
      console.error('Network error during deletion', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTitle.trim() || !newPrompt.trim()) {
      setFormError('Title and prompt cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, prompt: newPrompt, category: newCategory }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPrompts([saved, ...prompts]);
        setShowAddForm(false);
        setNewTitle('');
        setNewPrompt('');
        setNewCategory('General');
      } else {
        setFormError('Failed to save prompt on server.');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Build categories list from prompts
  const categoryCounts = prompts.reduce<Record<string, number>>((acc, p) => {
    const cat = p.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const categories = ['All', ...Object.keys(categoryCounts)];

  const filteredPrompts = prompts.filter(p => {
    const matchCat = activeCategory === 'All' || (p.category || 'General') === activeCategory;
    const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('tools')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white leading-none">Saved Prompts</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {prompts.length} custom prompt{prompts.length !== 1 ? 's' : ''} in your library
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> New Prompt
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Sidebar — Categories */}
        <div className="w-44 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0 overflow-y-auto">
          <div className="p-3 pt-4">
            <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-widest px-2 mb-2">Categories</p>
            <div className="space-y-0.5">
              {categories.map(cat => {
                const count = cat === 'All' ? prompts.length : categoryCounts[cat] || 0;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-sm ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                      isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — Prompts List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>
          </div>

          {/* Prompts */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-neutral-500 text-sm">Loading your prompts...</div>
            ) : filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-6">
                <Bookmark className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {searchQuery ? 'No prompts match your search' : 'No prompts yet. Create your first one!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {filteredPrompts.map(p => {
                  const cat = p.category || 'General';
                  const dotColor = CATEGORY_DOT[cat] || 'bg-neutral-400';
                  const tagColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS['General'];
                  return (
                    <div
                      key={p._id}
                      className="group px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      {/* Title Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${dotColor}`} />
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug truncate">
                            {p.title}
                          </h3>
                          <span className={`shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-full border ${tagColor}`}>
                            {cat}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleCopy(p._id, p.prompt)}
                            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Edit Prompt"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(p._id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Delete Prompt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Prompt Preview */}
                      <p className="mt-2 ml-5 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 font-mono leading-relaxed">
                        {p.prompt}
                      </p>

                      {/* Footer */}
                      <div className="mt-2.5 ml-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                          {p.usageCount !== undefined && <span>{p.usageCount} uses</span>}
                          <span>Saved {formatDate(p.createdAt)}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(p._id, p.prompt)}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          {copiedId === p._id ? (
                            <><Check className="w-3 h-3" /> Copied!</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Use prompt</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Prompt Modal */}
      {showAddForm && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">New Prompt</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPrompt} className="p-6 flex flex-col gap-4">
              {formError && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-3.5 py-2.5 rounded-xl text-sm border border-red-100 dark:border-red-500/20">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Feynman Layperson Explainer"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  >
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Prompt</label>
                <textarea
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  placeholder="Write your custom prompt here... Use {{variable}} for dynamic inputs"
                  rows={5}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPromptsWorkspace;
