import React, { useState, useEffect } from 'react';
import { Settings, KeyRound, Check, Moon, Sun, Info, Trash2, AlertTriangle, Cpu } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SettingsWorkspaceProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigate?: (view: string) => void;
}

const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({ isDarkMode, toggleTheme }) => {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [llmModel, setLlmModel] = useState('gemini-1.5-flash');
  const [saved, setSaved] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored && !import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKey(stored);
    }
    const storedModel = localStorage.getItem('gemini_model');
    if (storedModel) {
      setLlmModel(storedModel);
    }
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', llmModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to delete ALL your documents, notes, graphs, and saved prompts? This action cannot be undone.")) {
      setIsClearing(true);
      try {
        const response = await fetch('http://localhost:5000/api/knowledge/clear-all', { method: 'DELETE' });
        if (response.ok) {
          window.location.reload();
        } else {
          console.error("Failed to clear data");
          alert("Failed to clear data.");
        }
      } catch (err) {
        console.error("Error clearing data:", err);
        alert("Error clearing data.");
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
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
            Set your Gemini API key to enable AI features across the application. Your key is stored securely in your browser's local storage.
          </p>
          
          <div className="flex flex-col gap-4 max-w-2xl">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> AI Model
              </label>
              <CustomSelect
                value={llmModel}
                onChange={setLlmModel}
                placeholder="Choose AI model"
                icon={<Cpu className="w-4 h-4" />}
                options={[
                  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — Fast & Efficient' },
                  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — Advanced Reasoning' },
                  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview — Latest' },
                ]}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveKey}
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
            onClick={handleClearData}
            disabled={isClearing}
            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </button>
        </section>
      </div>
    </div>
  );
};

export default SettingsWorkspace;
