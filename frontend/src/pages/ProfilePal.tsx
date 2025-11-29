import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Sparkles, User, Bot, Upload, CheckCircle2, FileText, Briefcase, GraduationCap, Code, Award, MapPin, Zap, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { ProfilePalAPIService } from "@/services/profile-pal-api.service";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  file?: {
    name: string;
    size: string;
  };
}

const ProfilePal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "👋 Hi! I'm ProfilePal, your AI assistant for building an amazing profile! I can help you update your work experience, education, skills, and more - all through conversation. Just tell me about yourself, or upload your resume and I'll extract everything automatically!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = () => {
      // Check if there's an existing session in localStorage
      const storedSessionId = localStorage.getItem('profilepal_session_id');
      if (storedSessionId) {
        setSessionId(storedSessionId);
        // Load chat history for this session
        loadChatHistory(storedSessionId);
      } else {
        // Generate new session ID
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);
        localStorage.setItem('profilepal_session_id', newSessionId);
      }
    };

    if (user) {
      initSession();
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load chat history from database
  const loadChatHistory = async (sessionIdToLoad: string) => {
    try {
      const history = await ProfilePalAPIService.getChatHistory(sessionIdToLoad);
      if (history.length > 0) {
        setMessages(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Reset conversation
  const handleResetConversation = async () => {
    try {
      if (sessionId) {
        await ProfilePalAPIService.deleteChatHistory(sessionId);
      }
      // Generate new session ID
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      localStorage.setItem('profilepal_session_id', newSessionId);

      // Reset messages to initial greeting
      setMessages([
        {
          id: "1",
          type: "assistant",
          content: "👋 Hi! I'm ProfilePal, your AI assistant for building an amazing profile! I can help you update your work experience, education, skills, and more - all through conversation. Just tell me about yourself, or upload your resume and I'll extract everything automatically!",
        },
      ]);
      setSuggestions([]);
      toast.success("Conversation reset!");
    } catch (error) {
      toast.error("Failed to reset conversation");
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !attachedFile) || !sessionId) return;

    const messageContent = inputValue.trim() || "I've uploaded my resume";
    let fileInfo = undefined;

    if (attachedFile) {
      const fileSize = (attachedFile.size / 1024 / 1024).toFixed(2);
      fileInfo = {
        name: attachedFile.name,
        size: `${fileSize} MB`,
      };
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageContent,
      file: fileInfo,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    const fileToProcess = attachedFile;
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsTyping(true);

    try {
      if (fileToProcess) {
        // Process CV file first
        const cvResult = await processCVFile(fileToProcess);

        // Save user message to chat history with file metadata
        await ProfilePalAPIService.saveMessage(
          sessionId, 
          'user', 
          messageContent,
          fileInfo ? { file: fileInfo } : undefined
        );

        // Save CV processing result to chat history
        await ProfilePalAPIService.saveMessage(sessionId, 'assistant', cvResult.responseContent);

        // Show CV processing result
        const cvMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: cvResult.responseContent,
        };
        setMessages((prev) => [...prev, cvMessage]);

        // If user included a text message along with CV, send it to chatbot
        if (inputValue.trim() && inputValue.trim() !== "I've uploaded my resume") {
          // Small delay to show CV processing completed first
          await new Promise(resolve => setTimeout(resolve, 500));

          const chatResponse = await ProfilePalAPIService.sendMessage(inputValue.trim(), sessionId);

          const chatMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: "assistant",
            content: chatResponse.message,
          };

          setMessages((prev) => [...prev, chatMessage]);

          // Update suggestions from chat
          if (chatResponse.suggestions) {
            setSuggestions(chatResponse.suggestions);
          }

          // Show toast if profile was updated by chat
          if (chatResponse.profile_updated && chatResponse.updated_fields && chatResponse.updated_fields.length > 0) {
            toast.success(`Profile updated: ${chatResponse.updated_fields.join(', ')}`);
          }
        }
      } else {
        // Regular chat message (no file)
        const response = await ProfilePalAPIService.sendMessage(messageContent, sessionId);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: response.message,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update suggestions
        if (response.suggestions) {
          setSuggestions(response.suggestions);
        }

        // Show toast if profile was updated
        if (response.profile_updated && response.updated_fields && response.updated_fields.length > 0) {
          toast.success(`Profile updated: ${response.updated_fields.join(', ')}`);
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10MB");
      return;
    }

    setAttachedFile(file);
    toast.success("File attached! Add a message or send as-is.");
  };

  const processCVFile = async (file: File) => {
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    try {
      // Upload CV to storage
      const fileName = `${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("cvstorage")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Update profile with CV URL
      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ cv_url: fileName })
        .eq("user_id", user?.id);

      if (updateError) {
        await supabase.storage.from("cvstorage").remove([fileName]);
        throw updateError;
      }

      // Call CV autofill API
      const autofillResponse = await ProfilePalAPIService.processCVAutofill(fileName);

      let responseContent: string;
      if (autofillResponse.success && autofillResponse.updated_fields && autofillResponse.updated_fields.length > 0) {
        responseContent = `Perfect! I've analyzed your resume and extracted information! ✨\n\nI found and saved:\n${autofillResponse.updated_fields.map(field => `• ${field.replace(/_/g, ' ')}`).join('\n')}\n\nYour profile has been automatically updated! Is there anything else you'd like me to add or modify?`;
        toast.success(`CV processed! Updated ${autofillResponse.updated_fields.length} fields`);
      } else {
        responseContent = "I've saved your CV, but I wasn't able to extract much information automatically. Would you like to tell me about your experience so I can update your profile?";
      }

      return { responseContent, fileName, fileSize };
    } catch (error: any) {
      console.error('Error processing CV:', error);
      toast.error(error.message || 'Failed to process CV');
      throw error;
    }
  };

  return (
    <>
      <Navigation userType="seeker" />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
        {/* Enhanced Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-[hsl(var(--neon-pink))]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 container max-w-5xl mx-auto px-4 py-6 h-screen flex flex-col gap-4">
        {/* Enhanced Header */}
        <Card className="p-4 bg-card/90 backdrop-blur-md border-primary/30 shadow-glow">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full blur-lg opacity-60 animate-pulse" />
                <div className="relative bg-gradient-to-r from-primary via-secondary to-accent p-3 rounded-full shadow-glow">
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-rainbow">ProfilePal</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[hsl(var(--neon-orange))]" />
                  Your AI-Powered Profile Assistant
                </p>
                <p className="text-sm font-bold text-gradient-rainbow mt-1">
                  I can edit your ENTIRE profile!
                </p>
                <p className="text-xs text-foreground/80">
                  Just chat naturally or drop your resume - I'll handle the rest ✨
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetConversation}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Conversation
            </Button>
          </div>
        </Card>


        {/* Messages Container */}
        <Card className="flex-1 overflow-hidden bg-card/90 backdrop-blur-md border-primary/30 shadow-xl">
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                {message.type === "assistant" && (
                  <Avatar className="h-8 w-8 bg-gradient-to-r from-primary to-secondary border-2 border-primary/30">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground shadow-glow"
                      : "bg-card/80 backdrop-blur-sm border border-primary/20"
                  }`}
                >
                  {message.file && (
                    <div className="mb-2 flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.file.name}</p>
                        <p className="text-xs text-muted-foreground">{message.file.size}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.type === "user" && (
                  <Avatar className="h-8 w-8 bg-gradient-to-r from-accent to-secondary border-2 border-accent/30">
                    <AvatarFallback className="bg-transparent">
                      <User className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <Avatar className="h-8 w-8 bg-gradient-to-r from-primary to-secondary border-2 border-primary/30">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="h-5 w-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>


        {/* Input Area */}
        <Card className="p-4 bg-card/90 backdrop-blur-md border-primary/30 shadow-glow">
          {attachedFile && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 bg-gradient-to-br from-secondary/15 to-accent/15 border-secondary/40 hover:border-secondary/60 hover:shadow-glow-purple group"
              title="Attach Resume (PDF)"
            >
              <Upload className="h-5 w-5 text-secondary group-hover:scale-110 group-hover:rotate-12 transition-all" />
            </Button>

            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={attachedFile ? "Add a message (optional)..." : "Tell me about your experience, skills, or just chat..."}
                className="pr-10 bg-background/50 border-primary/40 focus:border-primary/60 focus:shadow-glow transition-all h-11"
              />
              <Paperclip className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() && !attachedFile}
              size="lg"
              className="flex-shrink-0 bg-gradient-to-r from-primary via-secondary to-accent hover:shadow-glow transition-all disabled:opacity-50 px-6"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
};

export default ProfilePal;
