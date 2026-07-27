import { useState, useEffect } from 'react';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import KnowledgeManager from './components/KnowledgeManager';
import FileExplorer from './components/FileExplorer';
import ToolGrid from './components/ToolGrid';
import KgGeneratorWorkspace from './components/KgGeneratorWorkspace';
import SavedPromptsWorkspace from './components/SavedPromptsWorkspace';
import ConceptExplainerWorkspace from './components/ConceptExplainerWorkspace';
import FlashcardGeneratorWorkspace from './components/FlashcardGeneratorWorkspace';
import ExamPredictorWorkspace from './components/ExamPredictorWorkspace';
import SettingsWorkspace from './components/SettingsWorkspace';

export type ViewState = 'home' | 'ingest' | 'stored-kb' | 'tools' | 'kg-generator' | 'saved-prompts' | 'smart-summariser' | 'concept-explainer' | 'flashcard-generator' | 'exam-predictor' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Dashboard onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'ingest':
        return <KnowledgeManager />;
      case 'stored-kb':
        return <FileExplorer onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'tools':
        return <ToolGrid onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'kg-generator':
        return <KgGeneratorWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'saved-prompts':
        return <SavedPromptsWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'smart-summariser':
        return <SmartSummariserWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'concept-explainer':
        return <ConceptExplainerWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'flashcard-generator':
        return <FlashcardGeneratorWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'exam-predictor':
        return <ExamPredictorWorkspace onNavigate={(v) => setCurrentView(v as ViewState)} />;
      case 'settings':
        return <SettingsWorkspace isDarkMode={isDarkMode} toggleTheme={toggleTheme} onNavigate={(v) => setCurrentView(v as ViewState)} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout 
      currentView={currentView} 
      onNavigate={setCurrentView}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    >
      {renderView()}
    </AppLayout>
  );
}

export default App;
