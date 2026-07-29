import React, { useState, useEffect, useCallback } from 'react';
import { Settings, KeyRound, Check, Moon, Sun, Info, Trash2, AlertTriangle, Cpu, X, CheckCircle, XCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SettingsWorkspaceProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigate?: (view: string) => void;
}

type ToastType = 'success' | 'error';
interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

// ------------------------------------------------------------------
// Toast Component
// ------------------------------------------------------------------
const Toast: React.FC<{ toast: ToastState; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-[280px] max-w-sm
        ${isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-200'
          : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-200'
        }`}
    >
      {isSuccess
        ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        : <XCircle className="w-5 h-5 text-red-500 shrink-0" />
      }
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 opacity-60" />
      </button>
    </div>
  );
};

// ------------------------------------------------------------------
// Confirm Modal Component
// ------------------------------------------------------------------
const ConfirmModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Clear All Data</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">This action cannot be undone</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          Are you sure you want to permanently delete <span className="font-semibold text-neutral-900 dark:text-white">all</span> of the following?
        </p>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5 pl-1">
          {['Documents & uploaded PDFs', 'All notes', 'Knowledge graphs', 'Saved prompts', 'All folders'].map(item => (
            <li key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          {isLoading ? 'Clearing...' : 'Yes, delete everything'}
        </button>
      </div>
    </div>
  </div>
);

// ------------------------------------------------------------------
// Main SettingsWorkspace Component
// ------------------------------------------------------------------
const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({ isDarkMode, toggleTheme }) => {
  const [llmModel, setLlmModel] = useState('llama3.2:1b');
  const [availableModels, setAvailableModels] = useState<{value: string, label: string}[]>([]);
  const [saved, setSaved] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const storedModel = localStorage.getItem('ollama_model') || localStorage.getItem('gemini_model');
    if (storedModel) {
      setLlmModel(storedModel);
    }

    fetch('http://localhost:11434/api/tags')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          const models = data.models.map((m: any) => ({
            value: m.name,
            label: m.name
          }));
          setAvailableModels(models);
        } else {
          setAvailableModels([{ value: 'llama3.2:1b', label: 'No models found locally' }]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch Ollama models:", err);
        setAvailableModels([{ value: 'llama3.2:1b', label: 'Cannot connect to Ollama' }]);
      });
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleSaveConfig = () => {
    localStorage.setItem('ollama_model', llmModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/clear-all', { method: 'DELETE' });
      if (response.ok) {
        showToast('All data cleared successfully. Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('Failed to clear data. Please try again.', 'error');
      }
    } catch (err) {
      showToast('Could not connect to server. Make sure the backend is running.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <header className="flex items-center gap-3">
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <Settings className="w-6 h-6 text-neutral-900 dark:text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Manage your preferences and configurations.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {/* API Configuration */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              API Configuration
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Select your local Ollama model to power AI features. Make sure Ollama is running on your machine.
            </p>
            
            <div className="flex flex-col gap-4 max-w-2xl">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> AI Model
                </label>
                <CustomSelect
                  value={llmModel}
                  onChange={setLlmModel}
                  placeholder="Choose AI model"
                  icon={<Cpu className="w-4 h-4" />}
                  options={availableModels}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 w-fit"
                >
                  {saved && <Check className="w-4 h-4" />}
                  {saved ? 'Saved' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                {isDarkMode ? <Moon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" /> : <Sun className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />}
                Appearance
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Toggle between light and dark themes.
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
            </button>
          </section>

          {/* About / System */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
              <Info className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              About EchoSphere
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              EchoSphere is your AI-powered study environment.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Version</span>
                <span className="text-sm text-neutral-500 font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Environment</span>
                <span className="text-sm text-neutral-500 font-mono capitalize">{import.meta.env.MODE || 'development'}</span>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300/80">
                Permanently delete all your knowledge base documents, notes, graphs, and saved prompts.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isClearing}
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </section>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          onConfirm={handleClearData}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isClearing}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
};

export default SettingsWorkspace;
