import React, { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft, Copy, Check, Plus, X, Trash2 } from 'lucide-react';

interface SavedPrompt {
  _id: string;
  title: string;
  prompt: string;
  createdAt: string;
}

interface SavedPromptsWorkspaceProps {
  onNavigate?: (view: string) => void;
}

const SavedPromptsWorkspace: React.FC<SavedPromptsWorkspaceProps> = ({ onNavigate }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/prompts')
      .then((res) => res.json())
      .then((data) => {
        setPrompts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch prompts', err);
        setLoading(false);
      });
  }, []);

  const handleDeletePrompt = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/prompts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPrompts(prompts.filter(p => p._id !== id));
      } else {
        console.error('Failed to delete prompt');
      }
    } catch (err) {
      console.error('Network error during deletion', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
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
        body: JSON.stringify({ title: newTitle, prompt: newPrompt })
      });
      if (res.ok) {
        const saved = await res.json();
        setPrompts([saved, ...prompts]);
        setShowAddForm(false);
        setNewTitle('');
        setNewPrompt('');
      } else {
        setFormError('Failed to save prompt on server.');
      }
    } catch (err) {
      console.error('Failed to save prompt', err);
      setFormError('Network error occurred.');
    } finally {
      setIsSaving(false);
    }
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
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Saved Prompts
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">
                Your library of custom prompts and workflow templates.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Prompt
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            Loading your prompts...
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
            <Bookmark className="w-12 h-12 mb-4 opacity-50" />
            <p>No saved prompts yet. Create some to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {prompts.map((p) => (
              <div
                key={p._id}
                className="group flex flex-col bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mr-4">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeletePrompt(p._id)}
                      className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 text-neutral-400 hover:text-red-500 transition-colors"
                      title="Delete Prompt"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCopy(p._id, p.prompt)}
                      className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                      title="Copy Prompt"
                    >
                      {copiedId === p._id ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-neutral-200 dark:bg-neutral-900 rounded-xl p-4 overflow-y-auto font-mono text-sm text-neutral-700 dark:text-neutral-300">
                  {p.prompt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Add New Prompt</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddPrompt} className="p-6 flex flex-col gap-5">
              {formError && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-500/20">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Summarize to bullet points"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Prompt Content</label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Write your custom prompt here..."
                  rows={5}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-colors"
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
