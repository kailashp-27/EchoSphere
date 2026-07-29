import React, { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, Database, FolderArchive, Wrench, Settings, ChevronLeft, ChevronRight, MessageSquare, X, Send, Bot, Sun, Moon, BrainCircuit, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ViewState } from '../App';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, currentView, onNavigate, isDarkMode, toggleTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: "Hi! I'm your EchoSphere study assistant. Ask me anything about your stored notes and documents — I'm here to help! 📚" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Auto-scroll to bottom of chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', next.toString());
      return next;
    });
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isThinking) return;

    setChatError('');
    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsThinking(true);

    const llmModel = localStorage.getItem('ollama_model') || 'llama3.2:1b';

    try {
      // Build history from all messages except the initial greeting and the new user message
      const history = updatedMessages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text
      }));

      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model-name': llmModel
        },
        body: JSON.stringify({
          message: trimmed,
          history: history.slice(0, -1) // exclude the current message from history
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatError(err.message || 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${err.message || 'Something went wrong. Please try again.'}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'ingest', label: 'Create KB', icon: Database },
    { id: 'stored-kb', label: 'Stored KB', icon: FolderArchive },
    { id: 'tools', label: 'AI Study Tools', icon: Wrench },
  ] as const;

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans transition-colors duration-200 overflow-hidden">
      {/* Sidebar */}
      <aside className={`border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 flex flex-col transition-all duration-300 relative z-10 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2 overflow-hidden truncate">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              EchoSphere
            </h1>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <button 
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white shadow-sm z-20"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        
        <nav className="flex-1 px-4 py-2 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${currentView === item.id 
                  ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-700 dark:text-blue-400' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'}
                ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">

          <button 
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${currentView === 'settings' 
                ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-700 dark:text-blue-400' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'}
              ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="h-full w-full max-w-7xl mx-auto p-8 transition-all duration-300">
          {children}
        </div>
      </main>

      {/* Global Floating Chat Button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-40"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Sliding Chat Panel overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-neutral-950/20 dark:bg-black/40 z-40 backdrop-blur-[2px]" onClick={() => setIsChatOpen(false)} />
      )}

      {/* Sliding Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col transform transition-transform duration-300 z-50 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              Ask My Notes
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Chat with your knowledge base</p>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                  {msg.role === 'user' 
                    ? <User className="w-3.5 h-3.5 text-white" /> 
                    : <Bot className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />}
                </div>
                <div className={`rounded-2xl p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap' 
                    : 'bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-transparent text-neutral-800 dark:text-neutral-200 rounded-tl-sm prose prose-sm dark:prose-invert max-w-none'
                }`}>
                  {msg.role === 'ai' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-neutral-200 dark:bg-neutral-700">
                  <BrainCircuit className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 animate-pulse" />
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-transparent rounded-2xl rounded-tl-sm p-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/50">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isThinking}
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl pl-4 pr-12 py-3 text-sm text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isThinking || !inputValue.trim()}
              className="absolute right-2 p-2 bg-neutral-900 dark:bg-white rounded-lg text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
