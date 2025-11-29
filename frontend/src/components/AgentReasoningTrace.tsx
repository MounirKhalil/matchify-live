import { Brain, Zap, Eye, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentStep {
  thought: string;
  action: {
    tool: string;
    input: Record<string, any>;
    reasoning: string;
  } | null;
  observation: string;
  timestamp: string;
}

interface AgentMetrics {
  tool_calls: number;
  total_tokens: number;
  cost_usd: number;
}

interface AgentReasoningTraceProps {
  steps: AgentStep[];
  metrics?: AgentMetrics;
  isVisible?: boolean;
}

export function AgentReasoningTrace({
  steps,
  metrics,
  isVisible = true,
}: AgentReasoningTraceProps) {
  if (!isVisible || !steps || steps.length === 0) return null;

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "semantic_search":
        return <Brain className="h-4 w-4 text-purple-500" />;
      case "keyword_search":
        return <Zap className="h-4 w-4 text-blue-500" />;
      case "external_search":
        return <Eye className="h-4 w-4 text-green-500" />;
      case "filter_candidates":
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const getToolColor = (toolName: string) => {
    switch (toolName) {
      case "semantic_search":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "keyword_search":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "external_search":
        return "bg-green-100 text-green-800 border-green-300";
      case "filter_candidates":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card className="mt-4 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-indigo-600" />
          Agent Reasoning Trace
          <Badge variant="outline" className="ml-auto">
            {steps.length} steps
          </Badge>
        </CardTitle>
        {metrics && (
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>🔧 {metrics.tool_calls} tool calls</span>
            <span>💬 {metrics.total_tokens.toLocaleString()} tokens</span>
            <span>💵 ${metrics.cost_usd.toFixed(4)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative pl-6 pb-4 border-l-2 border-indigo-200 last:border-l-0"
              >
                {/* Step number badge */}
                <div className="absolute -left-3 top-0 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>

                {/* Thought */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase">
                      Thought
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 italic bg-white p-2 rounded border border-gray-200">
                    "{step.thought}"
                  </p>
                </div>

                {/* Action */}
                {step.action && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600 uppercase">
                        Action
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        {getToolIcon(step.action.tool)}
                        <Badge className={getToolColor(step.action.tool)}>
                          {step.action.tool}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold">Input: </span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {JSON.stringify(step.action.input, null, 2)}
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observation */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-600 uppercase">
                      Observation
                    </span>
                  </div>
                  <div
                    className={`p-2 rounded border text-sm ${
                      step.observation.startsWith("ERROR")
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {step.observation.startsWith("ERROR") && (
                      <XCircle className="h-4 w-4 inline mr-2" />
                    )}
                    {!step.observation.startsWith("ERROR") && (
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                    )}
                    {step.observation}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Agent completed in {steps.length} reasoning steps
            </span>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
              Autonomous Decision-Making ✓
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
