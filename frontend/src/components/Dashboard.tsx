import React, { useState, useEffect } from 'react';
import { KeyRound, Check, FileText, Upload, LayoutGrid, Clock, File } from 'lucide-react';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [recentFiles, setRecentFiles] = useState<{_id: string, name: string, type: string}[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/knowledge/all-files')
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setRecentFiles(data.files.slice(0, 3));
        }
      })
      .catch(err => console.error('Failed to fetch recent files', err));
  }, []);



  const quickActions = [
    { label: 'New Note', icon: FileText, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-400/10', actionId: 'ingest' },
    { label: 'Upload PDF', icon: Upload, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-400/10', actionId: 'ingest' },
    { label: 'Generate Flashcards', icon: LayoutGrid, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-400/10', actionId: 'tools' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Welcome Back</h2>
        <p className="text-neutral-500 dark:text-neutral-400">Your AI-powered study environment is ready.</p>
      </header>



      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate && action.actionId ? onNavigate(action.actionId) : null}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-left"
            >
              <div className={`p-3 rounded-xl ${action.bg}`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Notes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Notes</h3>
          <button onClick={() => onNavigate?.('stored-kb')} className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">View All</button>
        </div>
        {recentFiles.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[200px] shadow-sm">
            <Clock className="w-10 h-10 text-neutral-400 dark:text-neutral-600 mb-3" />
            <h4 className="text-neutral-700 dark:text-neutral-300 font-medium">No recent notes</h4>
            <p className="text-sm text-neutral-500 mt-1">Create a note or upload a PDF to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentFiles.map(file => (
              <div key={file._id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                  {file.type === 'pdf' ? <File className="w-5 h-5 text-red-500" /> : <FileText className="w-5 h-5 text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-neutral-900 dark:text-white font-medium truncate">{file.name}</h4>
                  <p className="text-xs text-neutral-500 capitalize">{file.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
