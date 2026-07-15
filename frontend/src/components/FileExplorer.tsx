import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, FileText, LayoutGrid, List as ListIcon, ChevronRight, MoreVertical, Plus, Edit2, Trash2, Upload, FileSignature, Download, Save, Check } from 'lucide-react';

interface FileItem {
  _id: string;
  name: string;
  type: 'folder' | 'pdf' | 'docx' | 'note' | 'url';
  dateAdded: string;
  size?: string;
  itemCount?: number;
  description?: string;
  content?: string;
}

interface FileExplorerProps {
  onNavigate?: (view: any) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPath, setCurrentPath] = useState<{id: string, name: string}[]>([{ id: 'root', name: 'Knowledge Base' }]);
  const [items, setItems] = useState<FileItem[]>([]);
  
  // Folder Creation & Editing
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Dropdowns & Uploads
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Edit Note
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [saveNoteSuccess, setSaveNoteSuccess] = useState(false);

  const createMenuRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFolderId = currentPath[currentPath.length - 1].id;
  const currentFolderName = currentPath[currentPath.length - 1].name;

  const fetchContents = async (folderId: string) => {
    try {
      const url = new URL('http://localhost:5000/api/folders');
      if (folderId !== 'root') {
        url.searchParams.append('folderId', folderId);
      } else {
        url.searchParams.append('folderId', 'null');
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      const newItems: FileItem[] = [];
      if (data.folders) {
        data.folders.forEach((f: any) => {
          newItems.push({
            _id: f._id,
            name: f.name,
            description: f.description,
            type: 'folder',
            dateAdded: new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            itemCount: 0 // Ideally this would come from a backend aggregation
          });
        });
      }
      if (data.documents) {
        data.documents.forEach((d: any) => {
          newItems.push({
            _id: d._id,
            name: d.title,
            type: d.type as any,
            dateAdded: new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            size: 'Unknown' 
          });
        });
      }
      if (data.notes) {
        data.notes.forEach((n: any) => {
          newItems.push({
            _id: n._id,
            name: n.title,
            type: 'note',
            dateAdded: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            size: 'Unknown',
            content: n.content
          });
        });
      }
      
      setItems(newItems);
    } catch (err) {
      console.error('Error fetching contents:', err);
    }
  };

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId]);

  const handleOpenFolder = (folder: FileItem) => {
    if (folder.type === 'folder') {
      setCurrentPath([...currentPath, { id: folder._id, name: folder.name }]);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        let response;
        if (isEditingFolder && editingFolderId) {
          response = await fetch(`http://localhost:5000/api/folders/${editingFolderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newFolderName.trim(),
              description: newFolderDesc.trim(),
            })
          });
        } else {
          response = await fetch('http://localhost:5000/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newFolderName.trim(),
              description: newFolderDesc.trim(),
              parentFolderId: currentFolderId === 'root' ? null : currentFolderId,
              parentFolderName: currentFolderId === 'root' ? null : currentFolderName
            })
          });
        }

        if (response.ok) {
          await fetchContents(currentFolderId);
          setNewFolderName('');
          setNewFolderDesc('');
          setIsCreatingFolder(false);
          setIsEditingFolder(false);
          setEditingFolderId(null);
        }
      } catch (err) {
        console.error('Failed to save folder:', err);
      }
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this folder?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/folders/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchContents(currentFolderId);
          setActiveDropdownId(null);
        }
      } catch (err) {
        console.error('Failed to delete folder:', err);
      }
    }
  };

  const handleEditFolderClicked = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewFolderName(item.name);
    setNewFolderDesc(item.description || '');
    setEditingFolderId(item._id);
    setIsEditingFolder(true);
    setIsCreatingFolder(true); 
    setActiveDropdownId(null);
  };

  const handleUploadPdf = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (currentFolderId !== 'root') {
      formData.append('folderId', currentFolderId);
      formData.append('folderName', currentFolderName);
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        await fetchContents(currentFolderId);
        setIsUploadingPdf(false);
        setUploadFile(null);
      }
    } catch (err) {
      console.error('Failed to upload PDF', err);
    }
  };

  const handleEditNoteClicked = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditNoteId(item._id);
    setEditNoteTitle(item.name);
    setEditNoteContent(item.content || '');
    setIsEditingNote(true);
    setActiveDropdownId(null);
  };

  const handleSaveNoteEdit = async () => {
    if (!editNoteTitle.trim() || !editNoteId) return;
    setIsSavingNote(true);
    try {
      const response = await fetch(`http://localhost:5000/api/knowledge/note/${editNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editNoteTitle,
          content: editNoteContent
        })
      });
      if (response.ok) {
        setSaveNoteSuccess(true);
        await fetchContents(currentFolderId);
        setTimeout(() => {
          setSaveNoteSuccess(false);
          setIsEditingNote(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/knowledge/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          // Optimistically update
          setItems(items.filter(item => item._id !== id));
          setActiveDropdownId(null);
        }
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    }
  };

  const handleDownloadPdf = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(null);
    try {
      const response = await fetch(`http://localhost:5000/api/knowledge/download/${id}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  const getIconForType = (type: string, className = "w-10 h-10") => {
    switch(type) {
      case 'folder': return <Folder className={`${className} text-blue-500 fill-blue-500/20`} />;
      case 'pdf': return <FileText className={`${className} text-red-500 fill-red-500/10`} />;
      case 'docx': return <FileText className={`${className} text-blue-600 fill-blue-600/10`} />;
      case 'note': return <FileSignature className={`${className} text-emerald-500 fill-emerald-500/10`} />;
      case 'url': return <File className={`${className} text-purple-500 fill-purple-500/10`} />;
      default: return <File className={`${className} text-neutral-500`} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 p-4 justify-between items-center bg-neutral-50 dark:bg-neutral-950/50">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm font-medium text-neutral-600 dark:text-neutral-400 flex-1">
          {currentPath.map((pathItem, idx) => (
            <React.Fragment key={pathItem.id}>
              <button 
                onClick={() => navigateToBreadcrumb(idx)}
                className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${idx === currentPath.length - 1 ? 'text-neutral-900 dark:text-neutral-100 font-semibold' : ''}`}
              >
                {pathItem.name}
              </button>
              {idx < currentPath.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-2 text-neutral-400" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-4">
          
          {/* Create New Dropdown */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
            
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-xl shadow-neutral-900/10 dark:shadow-black/30 z-10 overflow-hidden">
                <div className="px-3 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Create New</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setIsEditingFolder(false);
                      setNewFolderName('');
                      setNewFolderDesc('');
                      setShowCreateMenu(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/25 transition-colors">
                      <Folder className="w-3.5 h-3.5 text-blue-500" />
                    </span>
                    <span>New Folder</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUploadingPdf(true);
                      setShowCreateMenu(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0 group-hover:bg-red-200 dark:group-hover:bg-red-500/25 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-red-500" />
                    </span>
                    <span>Upload File</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      if (onNavigate) onNavigate('ingest');
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl flex items-center gap-3 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/25 transition-colors">
                      <FileSignature className="w-3.5 h-3.5 text-emerald-500" />
                    </span>
                    <span>New Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 p-6 overflow-y-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/20 text-center px-4">
            <div className="w-16 h-16 bg-white dark:bg-neutral-800 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-500">
              <Folder className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">This folder is empty</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
              There are no files or folders here. Create a new folder or upload a document to get started.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateMenu(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Content
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {items.map((item) => (
              <div 
                key={item._id}
                onDoubleClick={() => handleOpenFolder(item)}
                className="group relative flex flex-col h-[220px] items-start p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/50 hover:shadow-md dark:hover:shadow-blue-900/20 bg-white dark:bg-neutral-900/50 transition-all cursor-pointer select-none"
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl">
                    {getIconForType(item.type, "w-8 h-8")}
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === item._id ? null : item._id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {activeDropdownId === item._id && (
                      <div ref={dropdownMenuRef} className="absolute right-0 top-full mt-1.5 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-xl shadow-neutral-900/10 dark:shadow-black/30 z-20 overflow-hidden">
                        <div className="px-3 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 truncate">{item.name}</p>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                          {item.type === 'folder' && (
                            <>
                              <button
                                onClick={(e) => handleEditFolderClicked(item, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                  <Edit2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                                </span>
                                Edit Details
                              </button>
                              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                              <button
                                onClick={(e) => handleDeleteFolder(item._id, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </span>
                                Delete Folder
                              </button>
                            </>
                          )}
                          {item.type === 'note' && (
                            <>
                              <button
                                onClick={(e) => handleEditNoteClicked(item, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                  <Edit2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                                </span>
                                Edit Note
                              </button>
                              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                              <button
                                onClick={(e) => handleDeleteDocument(item._id, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </span>
                                Delete Note
                              </button>
                            </>
                          )}
                          {(item.type === 'pdf' || item.type === 'docx') && (
                            <>
                              <button
                                onClick={(e) => handleDownloadPdf(item._id, item.name, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                  <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                                </span>
                                Download File
                              </button>
                              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                              <button
                                onClick={(e) => handleDeleteDocument(item._id, e)}
                                className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors"
                              >
                                <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </span>
                                Delete File
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white w-full truncate mb-1">
                  {item.name}
                </h3>
                
                {item.type === 'folder' && item.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 h-10 w-full">
                    {item.description}
                  </p>
                )}
                
                <div className="mt-auto pt-2 flex items-center justify-between w-full text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  <span>{item.dateAdded}</span>
                  <span>{item.type === 'folder' ? `${item.itemCount} items` : item.size}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <div className="col-span-6">Name</div>
              <div className="col-span-3">Date Added</div>
              <div className="col-span-2">Size / Items</div>
              <div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item) => (
                <div 
                  key={item._id}
                  onDoubleClick={() => handleOpenFolder(item)}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer select-none group relative"
                >
                  <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                    {getIconForType(item.type, "w-6 h-6")}
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="col-span-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.dateAdded}
                  </div>
                  <div className="col-span-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.type === 'folder' ? `${item.itemCount} items` : item.size}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === item._id ? null : item._id);
                        }}
                        className={`p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-opacity ${activeDropdownId === item._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <MoreVertical className="w-4 h-4 text-neutral-500" />
                      </button>
                      
                      {activeDropdownId === item._id && (
                        <div ref={dropdownMenuRef} className="absolute right-0 top-full mt-1.5 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-xl shadow-neutral-900/10 dark:shadow-black/30 z-20 overflow-hidden">
                          <div className="px-3 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 truncate">{item.name}</p>
                          </div>
                          <div className="p-1.5 space-y-0.5">
                            {item.type === 'folder' && (
                              <>
                                <button onClick={(e) => handleEditFolderClicked(item, e)} className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0"><Edit2 className="w-3.5 h-3.5 text-neutral-500" /></span>
                                  Edit Details
                                </button>
                                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                <button onClick={(e) => handleDeleteFolder(item._id, e)} className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></span>
                                  Delete Folder
                                </button>
                              </>
                            )}
                            {item.type === 'note' && (
                              <>
                                <button onClick={(e) => handleEditNoteClicked(item, e)} className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0"><Edit2 className="w-3.5 h-3.5 text-neutral-500" /></span>
                                  Edit Note
                                </button>
                                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                <button onClick={(e) => handleDeleteDocument(item._id, e)} className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></span>
                                  Delete Note
                                </button>
                              </>
                            )}
                            {(item.type === 'pdf' || item.type === 'docx') && (
                              <>
                                <button onClick={(e) => handleDownloadPdf(item._id, item.name, e)} className="w-full text-left px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0"><Download className="w-3.5 h-3.5 text-neutral-500" /></span>
                                  Download File
                                </button>
                                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                <button onClick={(e) => handleDeleteDocument(item._id, e)} className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors">
                                  <span className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></span>
                                  Delete File
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {isEditingFolder ? 'Edit Folder' : 'Create New Folder'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Semester 5"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Briefly describe the contents of this folder..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setIsEditingFolder(false);
                  setEditingFolderId(null);
                  setNewFolderName('');
                  setNewFolderDesc('');
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {isEditingFolder ? 'Save Changes' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload PDF/Docx Modal */}
      {isUploadingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Upload File</h2>
            </div>
            <div className="px-6 py-8 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 m-6 rounded-2xl bg-neutral-50 dark:bg-neutral-950/50">
              <Upload className="w-10 h-10 text-neutral-400 mb-3" />
              <input 
                type="file" 
                accept=".pdf,.docx"
                className="hidden" 
                id="file-upload" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
              <label 
                htmlFor="file-upload" 
                className="bg-white dark:bg-neutral-800 px-4 py-2 rounded-xl text-sm font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
              >
                Choose File
              </label>
              {uploadFile && (
                <p className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium truncate max-w-full px-4">
                  {uploadFile.name}
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsUploadingPdf(false);
                  setUploadFile(null);
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadPdf}
                disabled={!uploadFile}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {isEditingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Edit Note</h2>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Note Title..."
                value={editNoteTitle}
                onChange={e => setEditNoteTitle(e.target.value)}
                className="bg-transparent border-none text-3xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
              <textarea 
                placeholder="Start typing your notes here..."
                value={editNoteContent}
                onChange={e => setEditNoteContent(e.target.value)}
                className="flex-1 w-full bg-transparent border-none text-neutral-700 dark:text-neutral-300 resize-none focus:outline-none focus:ring-0 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 leading-relaxed text-lg"
              />
            </div>
            
            <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsEditingNote(false);
                  setEditNoteId(null);
                  setEditNoteTitle('');
                  setEditNoteContent('');
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNoteEdit}
                disabled={isSavingNote || !editNoteTitle.trim()}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white font-semibold transition-all ${
                  saveNoteSuccess ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saveNoteSuccess ? <><Check className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;