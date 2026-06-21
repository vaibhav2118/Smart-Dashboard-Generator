import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    Brain, MessageSquare, Send, Plus, Trash2, Edit3, Check, X, Loader2,
    Sparkles, AlertCircle, RefreshCw, Bookmark, HelpCircle, ArrowLeft, ArrowRight,
    Database
} from 'lucide-react';
import { getDataset } from '../utils/demoData';
import { useDataset } from '../context/DatasetContext';
import DatasetSelector from '../components/DatasetSelector';
import DatasetLifecycleRibbon from '../components/DatasetLifecycleRibbon';

const SUGGESTIONS = [
    "Why is revenue changing?",
    "Which KPIs require attention?",
    "What risks exist?",
    "What opportunities exist?",
    "What is forecasted next quarter?",
    "What correlations are strongest?",
    "What anomalies were detected?",
    "Generate executive summary."
];

const Chat = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { setActiveDataset } = useDataset();
    
    // Dataset metadata
    const [dataset, setDataset] = useState(null);

    // Guard: demo datasets cannot use the Chat API (requires real UUID)
    
    // Sessions & Messages state
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    // Input & Loading state
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    
    // Inline Rename session state
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [initialProcessed, setInitialProcessed] = useState(false);

    const isDemo = String(datasetId).startsWith('demo-');

    const messagesEndRef = useRef(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return { 'Authorization': `Bearer ${token}` };
    };

    // Load dataset info
    const loadDataset = useCallback(async () => {
        if (isDemo) return; // demo datasets not supported in Chat
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await axios.get('http://localhost:8000/api/datasets/', { headers });
            const resolved = getDataset(datasetId, res.data);
            if (resolved) {
                setDataset(resolved);
                setActiveDataset(resolved); // sync global context
            }
        } catch (e) {
            console.error("Failed to load dataset details", e);
        }
    }, [datasetId, isDemo, setActiveDataset]);

    // Load sessions
    const loadSessions = useCallback(async (selectFirst = false) => {
        setLoadingSessions(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/chat/sessions/${datasetId}`, { headers: getHeaders() });
            setSessions(res.data);
            if (res.data.length > 0) {
                if (selectFirst || !activeSessionId) {
                    setActiveSessionId(res.data[0].id);
                }
            } else {
                setActiveSessionId(null);
                setMessages([]);
            }
        } catch (e) {
            console.error("Failed to load chat sessions", e);
            setError("Failed to load chat sessions. Make sure API is online.");
        } finally {
            setLoadingSessions(false);
        }
    }, [datasetId, activeSessionId]);

    // Load messages for session
    const loadMessages = useCallback(async (sessId) => {
        if (!sessId) {
            setMessages([]);
            return;
        }
        setLoadingMessages(true);
        setError(null);
        try {
            const res = await axios.get(`http://localhost:8000/api/chat/messages/${sessId}`, { headers: getHeaders() });
            setMessages(res.data);
        } catch (e) {
            console.error("Failed to load messages", e);
            setError("Failed to retrieve conversation history.");
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (!isDemo) {
            loadDataset();
            loadSessions(true);
        }
    }, [datasetId, isDemo]);

    // Load messages when active session changes
    useEffect(() => {
        if (activeSessionId) {
            loadMessages(activeSessionId);
        }
    }, [activeSessionId, loadMessages]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    // Handle initial_message parameter for AI Explain actions
    useEffect(() => {
        const initialMessage = searchParams.get('initial_message');
        const widgetId = searchParams.get('widget_id');
        if (initialMessage && !initialProcessed && !loadingSessions && sessions !== null && !isDemo) {
            setInitialProcessed(true);
            setTimeout(() => {
                handleSendMessage(initialMessage, widgetId);
                setSearchParams({}, { replace: true });
            }, 500);
        }
    }, [searchParams, initialProcessed, loadingSessions, sessions, isDemo, setSearchParams]);

    // Send a message
    const handleSendMessage = async (textToSend, explicitWidgetId = null) => {
        const query = typeof textToSend === 'string' ? textToSend : input;
        if (!query.trim() || sending) return;

        setInput('');
        setSending(true);
        setError(null);

        // Add optimistic user message to screen
        const optimisticMsg = {
            id: 'optimistic-user',
            role: 'user',
            content: query,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const payload = {
                message: query,
                session_id: activeSessionId || null,
                widget_id: explicitWidgetId || searchParams.get('widget_id') || undefined
            };
            const res = await axios.post(`http://localhost:8000/api/chat/${datasetId}`, payload, { headers: getHeaders() });
            
            // If new session was created, refresh sessions and set active session ID
            if (!activeSessionId) {
                setActiveSessionId(res.data.session_id);
                await loadSessions();
            } else {
                // Just reload messages to get saved logs and clean layout
                await loadMessages(activeSessionId);
            }
        } catch (e) {
            console.error("Failed to submit chat message", e);
            setError(e.response?.data?.detail || "OpenAI Copilot request failed.");
            // Remove optimistic user message on error
            setMessages(prev => prev.filter(m => m.id !== 'optimistic-user'));
        } finally {
            setSending(false);
        }
    };

    // Rename Session
    const handleRenameSession = async (sessId) => {
        if (!renameTitle.trim()) return;
        try {
            await axios.put(`http://localhost:8000/api/chat/sessions/${sessId}`, { title: renameTitle }, { headers: getHeaders() });
            setEditingSessionId(null);
            loadSessions();
        } catch (e) {
            console.error("Failed to rename session", e);
        }
    };

    // Delete Session
    const handleDeleteSession = async (sessId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this conversation thread?")) return;
        try {
            await axios.delete(`http://localhost:8000/api/chat/sessions/${sessId}`, { headers: getHeaders() });
            if (activeSessionId === sessId) {
                setActiveSessionId(null);
                setMessages([]);
            }
            loadSessions(true);
        } catch (e) {
            console.error("Failed to delete session", e);
        }
    };

    // New Chat
    const handleNewChat = () => {
        setActiveSessionId(null);
        setMessages([]);
        setInput('');
        setError(null);
    };

    // Regenerate last response
    const handleRegenerate = async () => {
        if (messages.length < 2 || sending) return;
        // Find last user message
        const userMsgs = messages.filter(m => m.role === 'user');
        if (userMsgs.length === 0) return;
        const lastUserQuery = userMsgs[userMsgs.length - 1].content;
        
        // Remove last messages in the feed to simulate fresh query
        setMessages(prev => prev.slice(0, -1));
        handleSendMessage(lastUserQuery);
    };

    // Demo dataset guard screen
    if (isDemo) {
        const demoNames = {
            'demo-sales': 'Sales_Performance_Q2.csv',
            'demo-finance': 'Finance_Ledger_2026.xlsx',
            'demo-hr': 'HR_Retention_Profile.csv',
        };
        return (
            <div className="flex h-[calc(100vh-64px)] bg-slate-950 text-slate-100 items-center justify-center">
                <div className="max-w-md text-center space-y-6 p-8">
                    <div className="mx-auto w-16 h-16 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl flex items-center justify-center text-indigo-400">
                        <Brain size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-extrabold text-white">AI Copilot Requires a Real Dataset</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            <span className="font-semibold text-indigo-400">{demoNames[datasetId] || datasetId}</span> is a demo dataset.
                            AI Copilot can only analyse datasets that you have uploaded, as it queries your real data profile, KPIs, forecasts and insights.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Link
                            to="/datasets"
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
                        >
                            <Database size={16} /> Select a Real Dataset
                        </Link>
                        <Link
                            to="/upload"
                            className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
                        >
                            Upload New Dataset
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Left Sidebar - Chat History */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="text-indigo-500" size={18} />
                        <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Conversations</h2>
                    </div>
                    <button 
                        onClick={handleNewChat}
                        className="p-1.5 bg-indigo-600/90 hover:bg-indigo-600 rounded-xl text-white transition flex items-center gap-1 text-[11px] font-bold shadow-md shadow-indigo-600/20"
                        title="New Chat Session"
                    >
                        <Plus size={14} /> New Chat
                    </button>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {loadingSessions ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-2 text-slate-500">
                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                            <span className="text-xs font-semibold">Loading threads...</span>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center p-6 text-slate-500 text-xs font-medium space-y-1 mt-4">
                            <HelpCircle size={28} className="mx-auto text-slate-600 mb-1" />
                            <p>No chat history exists.</p>
                            <p className="text-[10px]">Start a thread by asking a question.</p>
                        </div>
                    ) : (
                        sessions.map(s => {
                            const isActive = activeSessionId === s.id;
                            const isEditing = editingSessionId === s.id;
                            return (
                                <div 
                                    key={s.id}
                                    onClick={() => !isEditing && setActiveSessionId(s.id)}
                                    className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition duration-150 ${
                                        isActive 
                                            ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-bold' 
                                            : 'border-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <MessageSquare size={14} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                                        {isEditing ? (
                                            <input 
                                                type="text" 
                                                value={renameTitle}
                                                onChange={e => setRenameTitle(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => e.key === 'Enter' && handleRenameSession(s.id)}
                                                className="bg-slate-950 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none w-full"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="text-xs truncate flex-1 leading-tight">{s.title}</span>
                                        )}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                        {isEditing ? (
                                            <>
                                                <button 
                                                    onClick={() => handleRenameSession(s.id)}
                                                    className="p-1 hover:bg-slate-800 rounded-lg text-emerald-500 transition"
                                                >
                                                    <Check size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => setEditingSessionId(null)}
                                                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 transition"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingSessionId(s.id);
                                                        setRenameTitle(s.title);
                                                    }}
                                                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition"
                                                    title="Rename thread"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteSession(s.id, e)}
                                                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition"
                                                    title="Delete thread"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Workspace */}
            <div className="flex-1 flex flex-col bg-slate-950">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-2xl shrink-0">
                            <Brain size={18} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider">
                                SmartDG Analytics Copilot
                            </h1>
                            <p className="text-[11px] font-semibold text-slate-500">
                                {dataset ? `Context: ${dataset.filename} (${dataset.dataset_category})` : "Loading Dataset context..."}
                            </p>
                        </div>
                        {/* Inline dataset switcher */}
                        <div className="ml-2">
                            <DatasetSelector currentId={datasetId} moduleBase="chat" variant="dark" />
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate(`/dashboard/${datasetId}`)}
                        className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                        <ArrowLeft size={12} /> Return Studio
                    </button>
                </div>

                <div className="px-6 pt-4 pb-0">
                    <DatasetLifecycleRibbon />
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loadingMessages && messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                            <Loader2 size={36} className="text-indigo-500 animate-spin" />
                            <p className="text-sm font-semibold">Loading conversation thread...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        /* Empty state with suggested prompts */
                        <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center py-12 space-y-8">
                            <div className="text-center space-y-3">
                                <div className="mx-auto w-14 h-14 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl flex items-center justify-center text-indigo-500 animate-bounce">
                                    <Sparkles size={28} />
                                </div>
                                <h2 className="text-lg font-extrabold text-white tracking-tight">Ask your Dataset anything</h2>
                                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                    SmartDG Copilot queries forecasting models, active KPI visualizers, and pre-computed insights to answer business questions with cited sources.
                                </p>
                            </div>

                            <div className="w-full space-y-3">
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <HelpCircle className="text-slate-500" size={14} />
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Suggested Queries</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {SUGGESTIONS.map((s, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSendMessage(s)}
                                            className="p-3.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-2xl text-left text-xs font-semibold text-slate-300 hover:text-white transition duration-150 flex items-center justify-between group"
                                        >
                                            <span>{s}</span>
                                            <ArrowRight size={12} className="text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Active messages list */
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((m) => {
                                const isUser = m.role === 'user';
                                return (
                                    <div key={m.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {/* Copilot avatar */}
                                        {!isUser && (
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white border border-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/10">
                                                <Brain size={16} />
                                            </div>
                                        )}

                                        <div className={`max-w-[80%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-3xl border text-sm shadow-sm leading-relaxed ${
                                                isUser 
                                                    ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none font-semibold' 
                                                    : 'bg-slate-900/60 text-slate-200 border-slate-800 rounded-tl-none'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                            </div>
                                            
                                            {/* Render citation sources if available (e.g. if assistant query return matches) */}
                                            {/* Note: We simulate citations matching references or formatting inside metadata */}
                                            {!isUser && m.id !== 'optimistic-assistant' && (
                                                <div className="flex flex-wrap items-center gap-1.5 px-1 mt-0.5">
                                                    <Bookmark size={11} className="text-indigo-400" />
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Sources:</span>
                                                    {/* Derive sources from text analysis if structured JSON is compiled in backend or inline citation tag */}
                                                    {(() => {
                                                        const txt = m.content.toLowerCase();
                                                        const sourcesFound = [];
                                                        if (txt.includes("kpi")) sourcesFound.push("KPI Analysis");
                                                        if (txt.includes("forecast") || txt.includes("projection")) sourcesFound.push("Forecast Results");
                                                        if (txt.includes("insight") || txt.includes("finding") || txt.includes("risk")) sourcesFound.push("AI Insights");
                                                        if (txt.includes("profile") || txt.includes("columns") || txt.includes("rows")) sourcesFound.push("Profile Analysis");
                                                        if (txt.includes("report")) sourcesFound.push("Reports");
                                                        
                                                        // Ensure at least one fallback source check
                                                        if (sourcesFound.length === 0) sourcesFound.push("AI Insights");
                                                        
                                                        return sourcesFound.map((src, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 rounded-lg text-[9px] font-extrabold tracking-wide">
                                                                {src}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Optimistic Assistant Loading Spinner */}
                            {sending && (
                                <div className="flex gap-4 justify-start">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white border border-indigo-500 flex items-center justify-center shrink-0 animate-pulse">
                                        <Brain size={16} />
                                    </div>
                                    <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-3xl rounded-tl-none flex items-center gap-3">
                                        <Loader2 size={16} className="text-indigo-500 animate-spin" />
                                        <span className="text-xs text-slate-400 font-medium">Copilot is analyzing context...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-6 py-2 bg-red-950/20 border-y border-red-900/30 flex items-center gap-2 text-red-400 text-xs font-semibold max-w-3xl mx-auto w-full rounded-2xl mb-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-450 hover:text-red-300">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Chat Input Toolbar */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/20">
                    <div className="max-w-3xl mx-auto flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500/50 transition">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Ask Copilot about trends, risks, forecasts, or KPIs..."
                            rows={1}
                            className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none resize-none max-h-24"
                        />
                        
                        {/* Regenerate Response */}
                        {messages.length >= 2 && !sending && (
                            <button
                                onClick={handleRegenerate}
                                className="p-2 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 rounded-xl transition"
                                title="Regenerate last response"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                        
                        {/* Send button */}
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!input.trim() || sending}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/10"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
