import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Brain, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentResume, getJobPostings, updateRewriteSuggestion, createChatSession, sendChatMessage, createRewriteSuggestions } from '@/lib/api';
import { computeMatchScore } from '@/lib/matching';
import { generateRewriteSuggestions } from '@/lib/rewrite-engine';
import type { RewriteSuggestion, JobPosting } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  module_routed?: string | null;
  suggestions?: RewriteSuggestion[];
  pendingJobId?: string;
}

export function ChatAssistant({ activeModule }: { activeModule: string }) {
  const { profile, activeRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && profile && !sessionId) {
      initSession();
    }
  }, [open, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function initSession() {
    if (!profile) return;
    const roleContext = activeRole === 'employer' ? 'employer' : 'seeker';
    try {
      const data = await createChatSession(roleContext);
      setSessionId(data.id);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: activeRole === 'employer'
          ? `Hello! I'm your Synapse AI assistant. I can help you analyze applicants, find candidates with specific skills, or explain match scores. What would you like to know?`
          : `Hello! I'm your Synapse AI assistant. I can help you understand your match scores, suggest resume improvements, or rewrite your resume for a specific job. What would you like to know?`,
      }]);
    } catch {
      // session creation failed silently
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId || !profile) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage }]);

    const isRewriteRequest = detectRewriteIntent(userMessage);

    if (isRewriteRequest && activeRole === 'seeker') {
      await handleRewriteRequest(userMessage);
    } else {
      try {
        const apiResponse = await sendChatMessage(sessionId, userMessage);
        setMessages(prev => [...prev, {
          id: `resp-${Date.now()}`,
          role: 'assistant',
          content: apiResponse.content,
          module_routed: apiResponse.module_routed,
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: `resp-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting to the AI service. Please try again in a moment.",
        }]);
      }
    }

    setLoading(false);
  }

  function detectRewriteIntent(query: string): boolean {
    const q = query.toLowerCase();
    return (
      (q.includes('rewrite') || q.includes('improve') || q.includes('tailor')) &&
      (q.includes('resume') || q.includes('summary') || q.includes('experience') || q.includes('skills') || q.includes('job'))
    );
  }

  async function handleRewriteRequest(userMessage: string) {
    if (!profile) return;

    try {
      const resume = await getCurrentResume(profile.id);
      if (!resume) {
        const msg = "I'd love to help you rewrite your resume, but I don't see a resume uploaded yet. Please upload your resume in the Resume section first, then come back and ask me to rewrite it for a specific job.";
        setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: msg, module_routed: 'resume' }]);
        return;
      }

      const jobs = await getJobPostings({ status: 'active' });
      if (jobs.length === 0) {
        const msg = "I found your resume, but there are no job postings to optimize for yet. Once jobs are available in the feed, I can rewrite your resume sections to match them.";
        setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: msg, module_routed: 'jobs' }]);
        return;
      }

      let targetJob: JobPosting | undefined;
      const mentionedJob = jobs.find(j => userMessage.toLowerCase().includes(j.title.toLowerCase().split(' ')[0]));
      if (mentionedJob) {
        targetJob = mentionedJob;
      } else {
        let bestScore = -1;
        for (const job of jobs) {
          const score = computeMatchScore(resume.raw_text, resume.skills, job.description, job.requirements);
          if (score.overall_score > bestScore) {
            bestScore = score.overall_score;
            targetJob = job;
          }
        }
      }

      if (!targetJob) {
        const msg = "I couldn't find a suitable job to optimize your resume for. Please try again later.";
        setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: msg }]);
        return;
      }

      const score = computeMatchScore(resume.raw_text, resume.skills, targetJob.description, targetJob.requirements);

      const drafts = generateRewriteSuggestions(
        resume.parsed_data,
        score.gap_report,
        targetJob.description,
        targetJob.requirements
      );

      if (drafts.length === 0) {
        const msg = `I analyzed your resume against "${targetJob.title}" and your resume is already well-aligned! Your match score is ${score.overall_score.toFixed(0)}%. No critical rewrites needed — your skills and experience sections cover the key requirements.`;
        setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: msg, module_routed: 'matching' }]);
        return;
      }

      const saved = await createRewriteSuggestions(resume.id, targetJob.id);

      const introMsg = `I analyzed your resume against **${targetJob.title}** (current match: ${score.overall_score.toFixed(0)}%). I found ${saved.length} area${saved.length > 1 ? 's' : ''} that could be improved. Here are my suggestions — you can accept, edit, or reject each one:`;

      setMessages(prev => [...prev, {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: introMsg,
        module_routed: 'matching',
        suggestions: saved,
      }]);
    } catch (e: any) {
      const msg = `I ran into an issue while generating rewrite suggestions: ${e.message}. Please try again or use the Match Score Analyzer page directly.`;
      setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: 'assistant', content: msg }]);
    }
  }

  async function handleAcceptSuggestion(msgId: string, suggestion: RewriteSuggestion) {
    await updateRewriteSuggestion(suggestion.id, {
      status: 'accepted',
      resolved_at: new Date().toISOString(),
    });
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.suggestions) return m;
      return {
        ...m,
        suggestions: m.suggestions.map(s => s.id === suggestion.id ? { ...s, status: 'accepted', resolved_at: new Date().toISOString() } : s),
      };
    }));
  }

  async function handleRejectSuggestion(msgId: string, suggestion: RewriteSuggestion) {
    await updateRewriteSuggestion(suggestion.id, {
      status: 'rejected',
      resolved_at: new Date().toISOString(),
    });
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.suggestions) return m;
      return {
        ...m,
        suggestions: m.suggestions.map(s => s.id === suggestion.id ? { ...s, status: 'rejected', resolved_at: new Date().toISOString() } : s),
      };
    }));
  }

  const quickActions = activeRole === 'employer'
    ? ['Show top candidates', 'Explain match scores', 'How to post a job']
    : ['Rewrite my resume for a job', 'Why is my score low?', 'Find relevant jobs'];

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-105"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
            <Sparkles className="h-3 w-3" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-950 shadow-2xl shadow-black/50 animate-slide-up" style={{ height: 560 }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Brain className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Synapse AI</div>
                <div className="text-xs text-slate-400 capitalize">{activeRole} mode</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-950/50 p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {msg.suggestions.map((sug) => (
                        <div key={sug.id} className={`rounded-lg border p-2.5 text-xs ${
                          sug.status === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10' :
                          sug.status === 'rejected' ? 'border-slate-700/50 bg-slate-800/30 opacity-60' :
                          'border-slate-700/50 bg-slate-800/30'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/30 capitalize">{sug.section_type}</span>
                            {sug.status !== 'pending' && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                sug.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                              }`}>{sug.status}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-[10px] font-medium text-slate-500 mb-0.5">Original</div>
                              <div className="text-slate-400 line-clamp-3">{sug.original_text}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-medium text-cyan-400 mb-0.5">Suggested</div>
                              <div className="text-slate-200 line-clamp-3">{sug.suggested_text}</div>
                            </div>
                          </div>
                          <div className="mt-1.5 text-[10px] text-slate-500 italic">{sug.reasoning}</div>
                          {sug.status === 'pending' && (
                            <div className="mt-2 flex gap-1.5">
                              <button
                                onClick={() => handleAcceptSuggestion(msg.id, sug)}
                                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-500"
                              >
                                <Check className="h-2.5 w-2.5" /> Accept
                              </button>
                              <button
                                onClick={() => handleRejectSuggestion(msg.id, sug)}
                                className="flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-600"
                              >
                                <X className="h-2.5 w-2.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.module_routed && msg.role === 'assistant' && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                      <Sparkles className="h-3 w-3" /> Routed to: {msg.module_routed}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          {messages.length <= 1 && (
            <div className="border-t border-slate-800/50 bg-slate-900/80 px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => { setInput(action); }}
                    className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-800/50 bg-slate-900/80 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
