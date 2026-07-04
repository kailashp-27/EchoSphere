import React, { useState, useEffect } from 'react';
import { Type, Link as LinkIcon, Folder, Save, Check } from 'lucide-react';

type IngestionMode = 'editor' | 'web';

export interface Folder {
  _id: string;
  name: string;
}

const KnowledgeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IngestionMode>('editor');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  
  // Note states
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Fetch folders from backend
    fetch('http://localhost:5000/api/folders')
      .then(res => res.json())
      .then(data => {
        if (data.folders) setFolders(data.folders);
      })
      .catch(err => console.error('Error fetching folders:', err));
  }, []);

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    
    setIsSaving(true);
    let targetFolderName = null;
    if (selectedFolderId !== 'root') {
      const targetFolder = folders.find(f => f._id === selectedFolderId);
      if (targetFolder) targetFolderName = targetFolder.name;
    }

    try {
      const response = await fetch('http://localhost:5000/api/knowledge/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          type: 'note',
          folderId: selectedFolderId === 'root' ? null : selectedFolderId,
          folderName: targetFolderName
        })
      });
      
      if (response.ok) {
        setSaveSuccess(true);
        setNoteTitle('');
        setNoteContent('');
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 p-2 gap-2 bg-neutral-50 dark:bg-neutral-950/50">
        {[
          { id: 'editor', label: 'Write Note', icon: Type },
          { id: 'web', label: 'Web Clip', icon: LinkIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as IngestionMode)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-8 overflow-y-auto w-full">
        {/* Destination Folder Selector */}
        <div className="mb-6 max-w-4xl mx-auto flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider ml-1">
            Where should this be saved?
          </label>
          <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:border-blue-500 transition-colors rounded-xl p-3 shadow-sm">
            <Folder className="w-5 h-5 text-blue-500" />
            <select
              title="Destination Folder"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="flex-1 bg-transparent border-none text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0 cursor-pointer text-base"
            >
              <option value="root" className="text-neutral-900 bg-white">Root (No Folder - Save to Knowledge Base)</option>
              {folders.map(f => (
                <option key={f._id} value={f._id} className="text-neutral-900 bg-white">{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'editor' && (
          <div className="h-full flex flex-col gap-4 max-w-4xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Note Title..."
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              className="bg-transparent border-none text-3xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
            />
            <textarea 
              placeholder="Start typing your notes here..."
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              className="flex-1 w-full bg-transparent border-none text-neutral-700 dark:text-neutral-300 resize-none focus:outline-none focus:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 leading-relaxed text-lg"
            />
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handleSaveNote}
                disabled={isSaving || !noteTitle.trim() || !noteContent.trim()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all
                  ${saveSuccess ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25'} 
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saveSuccess ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saveSuccess ? 'Saved!' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'web' && (
          <div className="h-full flex flex-col items-center pt-24">
            <div className="w-full max-w-2xl space-y-4">
              <div className="text-center mb-10">
                <div className="mx-auto w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                  <LinkIcon className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
                </div>
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white">Clip from Web</h3>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mt-2">Paste an article or webpage URL to ingest its content.</p>
              </div>
              <div className="flex gap-4">
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-5 py-4 text-base text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono placeholder:text-neutral-400"
                />
                <button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-8 py-4 rounded-xl text-base font-semibold transition-colors">
                  Fetch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeManager;
