import React from 'react';
import { 
  Zap, 
  Layers, 
  Lightbulb, 
  Edit3, 
  LineChart, 
  Bookmark,
  Network
} from 'lucide-react';

interface ToolGridProps {
  onNavigate?: (view: string) => void;
}

const ToolGrid: React.FC<ToolGridProps> = ({ onNavigate }) => {
  const tools = [
    {
      title: 'Knowledge Graph Generator',
      description: 'Map out connections visually. Turn any note or PDF into an interactive web of core concepts and relationships.',
      icon: Network,
      tag: 'AI',
      tag2: 'Visual',
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-400/10',
      actionId: 'kg-generator'
    },
    {
      title: 'Smart Summariser',
      description: 'Condense long documents and notes into bite-sized summaries.',
      icon: Zap,
      tag: 'AI',
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-400/10',
      actionId: 'smart-summariser'
    },
    {
      title: 'Flashcard Generator',
      description: 'Automatically generate Anki-style flashcards from your text.',
      icon: Layers,
      tag: 'RAG',
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-400/10'
    },
    {
      title: 'Concept Explainer',
      description: 'Explain complex topics simply using the Feynman technique.',
      icon: Lightbulb,
      tag: 'AI',
      color: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-400/10',
      actionId: 'concept-explainer'
    },
    {
      title: 'Exam Predictor',
      description: 'Generate potential exam questions from your knowledge base.',
      icon: LineChart,
      tag: 'RAG',
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-400/10'
    },
    {
      title: 'Saved Prompts',
      description: 'Access your library of custom prompts and workflow templates.',
      icon: Bookmark,
      tag: 'Local',
      color: 'text-neutral-500 dark:text-neutral-400',
      bg: 'bg-neutral-200 dark:bg-neutral-600/10',
      actionId: 'saved-prompts'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">AI Study Tools</h2>
        <p className="text-neutral-500 dark:text-neutral-400">Leverage AI to process, understand, and review your notes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, idx) => (
          <div 
            key={idx}
            onClick={() => {
              if (tool.actionId && onNavigate) {
                onNavigate(tool.actionId);
              }
            }}
            className="group block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200 cursor-pointer shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${tool.bg} shadow-sm dark:shadow-inner`}>
                <tool.icon className={`w-6 h-6 ${tool.color}`} />
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  {tool.tag}
                </span>
                {tool.tag2 && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    {tool.tag2}
                  </span>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {tool.title}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
              {tool.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolGrid;
