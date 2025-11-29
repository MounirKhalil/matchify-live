import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  MessageSquare,
  Send,
  Sparkles,
  User,
  Bot,
} from "lucide-react";
import { Link } from "react-router-dom";

const JobSeekerChatbot = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm your AI Career Assistant. I can help you with job searching, CV optimization, application tracking, and career advice. What would you like to know?",
      timestamp: "10:00 AM",
    },
    {
      id: 2,
      role: "user",
      content: "What are my top job matches right now?",
      timestamp: "10:01 AM",
    },
    {
      id: 3,
      role: "assistant",
      content:
        "Based on your profile, here are your top 3 job matches:\n\n1. **Senior Frontend Developer at TechCorp** (95% match)\n   - Remote position\n   - Salary: $120k - $150k\n   - Your React and TypeScript skills are a perfect fit\n\n2. **Full Stack Engineer at StartupXYZ** (88% match)\n   - San Francisco, CA\n   - Salary: $130k - $160k\n   - Matches your full-stack experience\n\n3. **React Developer at Digital Solutions** (92% match)\n   - New York, NY\n   - Salary: $100k - $130k\n   - Strong alignment with your frontend expertise\n\nWould you like me to apply to any of these positions?",
      timestamp: "10:01 AM",
    },
  ]);

  const suggestedPrompts = [
    "Show me new job matches",
    "How can I improve my profile?",
    "What's the status of my applications?",
    "Help me prepare for an interview",
  ];

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      role: "user" as const,
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([...messages, newMessage]);
    setMessage("");

    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        role: "assistant" as const,
        content:
          "I'm analyzing your request and searching through available opportunities. Let me help you with that...",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/dashboard/seeker" className="flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Matchify
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/seeker">Back to Dashboard</Link>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm">JS</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Career Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Get personalized career advice, job recommendations, and application support
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="border-border/60 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Suggested
                </CardTitle>
                <CardDescription className="text-xs">Try asking me:</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedPrompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-xs h-auto py-2.5 px-3 text-left hover:bg-accent/5 hover:text-accent hover:border-accent/30 transition-all"
                    onClick={() => setMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-md bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What I Can Help With</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-white">1</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">Find and recommend personalized job matches</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-white">2</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">Optimize your CV for specific positions</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-white">3</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">Track and update application statuses</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-purple flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-white">4</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">Provide career advice and interview prep</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <Card className="flex flex-col h-[calc(100vh-13rem)] border-border/60 shadow-lg">
            <CardHeader className="border-b bg-muted/30 py-3.5">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        {msg.role === "assistant" ? (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary shadow-md">
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-muted">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={`flex-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-primary to-primary-glow text-white ml-auto"
                              : "bg-muted/80 border border-border/50"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t bg-muted/20 p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me anything about your job search..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 h-11 bg-background border-border/60 focus-visible:ring-primary/30"
                  />
                  <Button 
                    variant="hero" 
                    size="icon" 
                    onClick={handleSend} 
                    disabled={!message.trim()}
                    className="h-11 w-11 shadow-md hover:shadow-lg transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobSeekerChatbot;
