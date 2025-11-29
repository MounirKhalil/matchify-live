import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, MapPin, Briefcase, FileText, User, Brain, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AgentReasoningTrace } from "@/components/AgentReasoningTrace";

interface Message {
  role: "recruiter" | "bot";
  content: string;
  timestamp: string;
}

interface Candidate {
  id: string;
  name?: string;
  headline?: string;
  location?: string;
  years_of_experience?: number;
  skills?: string[];
  current_position?: string;
  current_company?: string;
  relevance_score: number;
  cv_url?: string;
}

const RecruiterChatbot = () => {
  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const [agentTrace, setAgentTrace] = useState<any[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<any>(null);
  const [showTrace, setShowTrace] = useState(true);
  const [useReactAgent, setUseReactAgent] = useState(true); // Toggle for ReAct agent

  useEffect(() => {
    const fetchRecruiterProfile = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setRecruiterId(data.id);
      }
    };

    fetchRecruiterProfile();
  }, [session]);

  // Load most recent conversation when recruiter ID is available
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!recruiterId) return;

      const { data, error } = await supabase
        .from("chatbot_conversations")
        .select("*")
        .eq("recruiter_id", recruiterId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.conversation_history) {
        setConversationId(data.id);
        setMessages(data.conversation_history as unknown as Message[]);
      }
    };

    loadConversationHistory();
  }, [recruiterId]);

  const handleSend = async () => {
    if (!message.trim() || !recruiterId || isLoading) return;

    const userMessage: Message = {
      role: "recruiter",
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      // Choose which agent to use (ReAct or legacy)
      const functionName = useReactAgent ? "recruiter-chatbot-react" : "recruiter-chatbot";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          recruiter_id: recruiterId,
          conversation_id: conversationId,
          user_message: userMessage.content,
          conversation_history: messages,
        },
      });

      if (error) throw error;

      const botMessage: Message = {
        role: "bot",
        content: data.bot_response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
      }

      // Store agent reasoning trace if available (ReAct agent)
      if (data.agent_trace) {
        setAgentTrace(data.agent_trace);
      }

      // Store agent metrics if available
      if (data.metrics) {
        setAgentMetrics(data.metrics);
      }

      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      // Show success toast with metrics for ReAct agent
      if (useReactAgent && data.metrics) {
        toast.success(
          `Found ${data.candidates_count} candidates using ${data.metrics.tool_calls} tool calls (Cost: $${data.metrics.cost_usd.toFixed(4)})`
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return "hsl(var(--chart-1))";
    if (score >= 60) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
  };

  return (
    <RecruiterLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="border-b bg-card/80 backdrop-blur-xl px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                AI Candidate Search
                {useReactAgent && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <Brain className="h-3 w-3 mr-1" />
                    ReAct Agent
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {useReactAgent
                  ? "Autonomous agent with reasoning, planning, and tool selection"
                  : "Search for candidates using natural language"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showTrace ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTrace(!showTrace)}
                disabled={!useReactAgent || agentTrace.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showTrace ? "Hide" : "Show"} Agent Trace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseReactAgent(!useReactAgent)}
              >
                {useReactAgent ? "Use Legacy Agent" : "Use ReAct Agent"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Start Your Candidate Search</h3>
                    <p className="text-sm max-w-md">
                      Ask me to find candidates based on skills, experience, location, and more.
                    </p>
                    <p className="text-xs mt-4 text-muted-foreground/70">
                      Example: "Find React developers with 5+ years in San Francisco"
                    </p>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      msg.role === "recruiter" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "bot" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[75%] ${
                        msg.role === "recruiter"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className="text-xs opacity-60 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {msg.role === "recruiter" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-muted">
                      <p className="text-sm">
                        {useReactAgent
                          ? "Agent is thinking and planning tool usage..."
                          : "Searching for candidates..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Agent Reasoning Trace */}
                {useReactAgent && agentTrace.length > 0 && (
                  <div className="max-w-4xl mx-auto">
                    <AgentReasoningTrace
                      steps={agentTrace}
                      metrics={agentMetrics}
                      isVisible={showTrace}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area - Sticky at bottom */}
            <div className="border-t bg-card/80 backdrop-blur-xl p-4 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Ask me to find candidates (e.g., 'Find senior Python engineers with ML experience')"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading || !recruiterId}
                      className="pr-12 py-6 rounded-2xl resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handleSend} 
                    size="icon" 
                    disabled={isLoading || !recruiterId || !message.trim()}
                    className="h-12 w-12 rounded-xl shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Sidebar */}
          {candidates.length > 0 && (
            <div className="w-96 border-l bg-muted/30 flex flex-col">
              <div className="border-b p-4 flex-shrink-0">
                <h2 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''} Found
                </h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <Card key={candidate.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">
                                {candidate.name || 'Anonymous'}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {candidate.headline || candidate.current_position}
                              </p>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="shrink-0 text-xs"
                              style={{ 
                                backgroundColor: `${getRelevanceColor(candidate.relevance_score)}15`,
                                color: getRelevanceColor(candidate.relevance_score),
                                border: `1px solid ${getRelevanceColor(candidate.relevance_score)}30`
                              }}
                            >
                              {candidate.relevance_score}%
                            </Badge>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{candidate.location || 'Location not specified'}</span>
                            </div>
                            {candidate.years_of_experience && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Briefcase className="h-3 w-3 shrink-0" />
                                <span>{candidate.years_of_experience} years exp</span>
                              </div>
                            )}
                          </div>

                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 3).map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                  +{candidate.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex gap-1.5 pt-2">
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                              <User className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {candidate.cv_url && (
                              <Button variant="outline" size="sm" className="h-8 px-2" asChild>
                                <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterChatbot;
