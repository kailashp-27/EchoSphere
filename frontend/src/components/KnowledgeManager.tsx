import React, { useState, useEffect } from 'react';
import { Type, Link as LinkIcon, Folder, Save, Check, Loader2, AlertCircle, Globe } from 'lucide-react';
import CustomSelect from './CustomSelect';

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

  // Web clip states
  const [webUrl, setWebUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  const handleFetchWebClip = async () => {
    const trimmedUrl = webUrl.trim();
    if (!trimmedUrl) return;

    setIsFetching(true);
    setFetchError(null);
    setFetchSuccess(null);

    let targetFolderName = null;
    if (selectedFolderId !== 'root') {
      const targetFolder = folders.find(f => f._id === selectedFolderId);
      if (targetFolder) targetFolderName = targetFolder.name;
    }

    try {
      const response = await fetch('http://localhost:5000/api/knowledge/web-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          folderId: selectedFolderId === 'root' ? null : selectedFolderId,
          folderName: targetFolderName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFetchError(data.error || 'Failed to clip page. Please try again.');
      } else {
        setFetchSuccess(`"${data.note.title}" saved to your knowledge base!`);
        setWebUrl('');
        setTimeout(() => setFetchSuccess(null), 5000);
      }
    } catch (err: any) {
      setFetchError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleWebUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFetchWebClip();
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
          <CustomSelect
            value={selectedFolderId}
            onChange={setSelectedFolderId}
            placeholder="Select destination folder"
            icon={<Folder className="w-4 h-4 text-blue-500" />}
            options={[
              { value: 'root', label: 'Root (Knowledge Base — No Folder)' },
              ...folders.map(f => ({ value: f._id, label: f.name, icon: <Folder className="w-3.5 h-3.5 text-blue-400" /> }))
            ]}
          />
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
          <div className="h-full flex flex-col items-center pt-16">
            <div className="w-full max-w-2xl space-y-6">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700/50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Clip from Web</h3>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mt-2">
                  Paste any article or webpage URL. EchoSphere will extract the content and save it to your knowledge base.
                </p>
              </div>

              {/* URL Input Row */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  <input
                    type="url"
                    value={webUrl}
                    onChange={e => {
                      setWebUrl(e.target.value);
                      if (fetchError) setFetchError(null);
                      if (fetchSuccess) setFetchSuccess(null);
                    }}
                    onKeyDown={handleWebUrlKeyDown}
                    placeholder="https://example.com/article"
                    disabled={isFetching}
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl pl-11 pr-5 py-4 text-base text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono placeholder:text-neutral-400 disabled:opacity-60"
                  />
                </div>
                <button
                  onClick={handleFetchWebClip}
                  disabled={isFetching || !webUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-7 py-4 rounded-xl text-base font-semibold transition-all flex items-center gap-2 shadow-sm hover:shadow-blue-500/25 whitespace-nowrap"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Clipping...
                    </>
                  ) : (
                    <>
                      <Globe className="w-5 h-5" />
                      Fetch & Save
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {fetchError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{fetchError}</p>
                </div>
              )}

              {fetchSuccess && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{fetchSuccess}</p>
                </div>
              )}

              {/* Info Note */}
              <div className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">i</span>
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
                  <p>Content is extracted from the page's article or main body. Paywalled or JavaScript-heavy pages may not clip correctly.</p>
                  <p>Press <kbd className="px-1.5 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 rounded font-mono">Enter</kbd> to fetch.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeManager;
