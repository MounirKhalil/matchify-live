import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Github,
  Linkedin,
  Search,
  Code,
  Users,
  Mail,
  Zap,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface APISettings {
  id?: string;
  recruiter_id?: string;
  github_token?: string;
  proxycurl_api_key?: string;
  scrapingbee_api_key?: string;
  apify_api_key?: string;
  phantombuster_api_key?: string;
  rapidapi_key?: string;
  serpapi_key?: string;
  hunter_api_key?: string;
  rocketreach_api_key?: string;
  anthropic_api_key?: string;
  stackoverflow_api_key?: string;
  use_github?: boolean;
  use_linkedin?: boolean;
  use_google?: boolean;
  use_stackoverflow?: boolean;
  use_twitter?: boolean;
  linkedin_provider?: string;
  email_provider?: string;
  min_results?: number;
  max_results?: number;
  default_min_match_score?: number;
}

interface ServiceStatus {
  name: string;
  key: string;
  icon: React.ReactNode;
  configured: boolean;
  cost: string;
  importance: "critical" | "recommended" | "optional";
}

export function HeadHuntSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<APISettings>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: recruiterProfile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .single();

      if (!recruiterProfile) return;

      const { data, error } = await supabase
        .from("recruiter_api_settings")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setSettings(data || {
        use_github: true,
        use_linkedin: true,
        use_google: false,
        use_stackoverflow: false,
        use_twitter: false,
        linkedin_provider: "proxycurl",
        email_provider: "hunter",
        min_results: 10,
        max_results: 50,
        default_min_match_score: 70,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load API settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { data: recruiterProfile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .single();

      if (!recruiterProfile) throw new Error("Recruiter profile not found");

      const settingsToSave = {
        ...settings,
        recruiter_id: recruiterProfile.id,
      };

      const { error } = await supabase
        .from("recruiter_api_settings")
        .upsert(settingsToSave, {
          onConflict: "recruiter_id",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "API settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save API settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof APISettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getServiceStatus = (): ServiceStatus[] => [
    {
      name: "GitHub (Free)",
      key: "github_token",
      icon: <Github className="h-4 w-4" />,
      configured: !!settings.github_token,
      cost: "FREE",
      importance: "critical",
    },
    {
      name: "ProxyCurl (LinkedIn)",
      key: "proxycurl_api_key",
      icon: <Linkedin className="h-4 w-4 text-blue-600" />,
      configured: !!settings.proxycurl_api_key,
      cost: "$150+/mo",
      importance: "recommended",
    },
    {
      name: "ScrapingBee",
      key: "scrapingbee_api_key",
      icon: <Users className="h-4 w-4" />,
      configured: !!settings.scrapingbee_api_key,
      cost: "$49+/mo",
      importance: "recommended",
    },
    {
      name: "Apify",
      key: "apify_api_key",
      icon: <Users className="h-4 w-4" />,
      configured: !!settings.apify_api_key,
      cost: "$49+/mo",
      importance: "recommended",
    },
    {
      name: "PhantomBuster",
      key: "phantombuster_api_key",
      icon: <Users className="h-4 w-4" />,
      configured: !!settings.phantombuster_api_key,
      cost: "$69+/mo",
      importance: "recommended",
    },
    {
      name: "SerpAPI (Google)",
      key: "serpapi_key",
      icon: <Search className="h-4 w-4 text-blue-500" />,
      configured: !!settings.serpapi_key,
      cost: "$50+/mo",
      importance: "optional",
    },
    {
      name: "StackOverflow",
      key: "stackoverflow_api_key",
      icon: <Code className="h-4 w-4 text-orange-500" />,
      configured: !!settings.stackoverflow_api_key,
      cost: "FREE",
      importance: "optional",
    },
    {
      name: "Hunter.io (Email)",
      key: "hunter_api_key",
      icon: <Mail className="h-4 w-4" />,
      configured: !!settings.hunter_api_key,
      cost: "$49+/mo",
      importance: "optional",
    },
    {
      name: "Claude AI (Enrichment)",
      key: "anthropic_api_key",
      icon: <Zap className="h-4 w-4" />,
      configured: !!settings.anthropic_api_key,
      cost: "$20+/mo",
      importance: "optional",
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const serviceStatuses = getServiceStatus();
  const configured = serviceStatuses.filter(s => s.configured);
  
  const criticalServices = serviceStatuses.filter(s => s.importance === "critical");
  const recommendedServices = serviceStatuses.filter(s => s.importance === "recommended");
  const optionalServices = serviceStatuses.filter(s => s.importance === "optional");

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-gradient-to-br from-background to-secondary/20">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">API Services Configuration</CardTitle>
              <CardDescription className="mt-2">
                Configure your API keys and preferences for headhunting
              </CardDescription>
            </div>
            <Badge variant="outline" className="h-fit">
              {configured.length}/{serviceStatuses.length} Active
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200/20">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-3 w-3 text-green-600" />
                <div className="text-xl font-bold text-green-600">{configured.length}</div>
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 text-blue-600" />
                <div className="text-xl font-bold text-blue-600">{serviceStatuses.length}</div>
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200/20">
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-3 w-3 text-purple-600" />
                <div className="text-xl font-bold text-foreground">
                  {settings.min_results || 10}-{settings.max_results || 50}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Results</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-200/20">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3 w-3 text-orange-600" />
                <div className="text-xl font-bold text-foreground">
                  {settings.default_min_match_score || 70}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Match</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">

          <Alert className="border-blue-200/50 bg-blue-50/50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Free to Start</AlertTitle>
            <AlertDescription className="text-blue-800">
              Start with GitHub (FREE) to find 20-30 candidates. Add paid services to expand reach.
            </AlertDescription>
          </Alert>

          {/* API Services - Grouped by importance */}
          <div className="space-y-5">
            {criticalServices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  <p className="text-xs text-muted-foreground">Essential services</p>
                </div>
                {criticalServices.map(service => (
                  service.configured ? (
                    <div key={service.key} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-50/50 rounded-lg border border-green-200/60">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">{service.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <Badge variant="secondary" className="text-xs mt-1">{service.cost}</Badge>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <APIKeyInput
                      key={service.key}
                      service={service}
                      value={(settings as any)[service.key] || ""}
                      onChange={(value) => updateSetting(service.key as keyof APISettings, value)}
                      isVisible={showKeys[service.key]}
                      onToggleVisible={() => toggleShowKey(service.key)}
                    />
                  )
                ))}
              </div>
            )}

            {recommendedServices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Recommended</Badge>
                  <p className="text-xs text-muted-foreground">Enhanced capabilities</p>
                </div>
                {recommendedServices.map(service => (
                  service.configured ? (
                    <div key={service.key} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-50/50 rounded-lg border border-green-200/60">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">{service.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <Badge variant="secondary" className="text-xs mt-1">{service.cost}</Badge>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <APIKeyInput
                      key={service.key}
                      service={service}
                      value={(settings as any)[service.key] || ""}
                      onChange={(value) => updateSetting(service.key as keyof APISettings, value)}
                      isVisible={showKeys[service.key]}
                      onToggleVisible={() => toggleShowKey(service.key)}
                    />
                  )
                ))}
              </div>
            )}

            {optionalServices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                  <p className="text-xs text-muted-foreground">Additional sources</p>
                </div>
                {optionalServices.map(service => (
                  service.configured ? (
                    <div key={service.key} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-50/50 rounded-lg border border-green-200/60">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">{service.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <Badge variant="secondary" className="text-xs mt-1">{service.cost}</Badge>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <APIKeyInput
                      key={service.key}
                      service={service}
                      value={(settings as any)[service.key] || ""}
                      onChange={(value) => updateSetting(service.key as keyof APISettings, value)}
                      isVisible={showKeys[service.key]}
                      onToggleVisible={() => toggleShowKey(service.key)}
                    />
                  )
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Service Selection & Preferences - More compact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Search Configuration</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_github"
                  checked={settings.use_github || false}
                  onCheckedChange={(checked) => updateSetting("use_github", checked)}
                />
                <label htmlFor="use_github" className="text-sm">GitHub</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_linkedin"
                  checked={settings.use_linkedin || false}
                  onCheckedChange={(checked) => updateSetting("use_linkedin", checked)}
                />
                <label htmlFor="use_linkedin" className="text-sm">LinkedIn</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_google"
                  checked={settings.use_google || false}
                  onCheckedChange={(checked) => updateSetting("use_google", checked)}
                />
                <label htmlFor="use_google" className="text-sm">Google</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_stackoverflow"
                  checked={settings.use_stackoverflow || false}
                  onCheckedChange={(checked) => updateSetting("use_stackoverflow", checked)}
                />
                <label htmlFor="use_stackoverflow" className="text-sm">StackOverflow</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use_twitter"
                  checked={settings.use_twitter || false}
                  onCheckedChange={(checked) => updateSetting("use_twitter", checked)}
                />
                <label htmlFor="use_twitter" className="text-sm">Twitter</label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="linkedin_provider" className="text-sm">LinkedIn Provider</Label>
                <Select
                  value={settings.linkedin_provider || "proxycurl"}
                  onValueChange={(value) => updateSetting("linkedin_provider", value)}
                >
                  <SelectTrigger id="linkedin_provider" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proxycurl">ProxyCurl</SelectItem>
                    <SelectItem value="phantombuster">PhantomBuster</SelectItem>
                    <SelectItem value="apify">Apify</SelectItem>
                    <SelectItem value="scrapingbee">ScrapingBee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email_provider" className="text-sm">Email Provider</Label>
                <Select
                  value={settings.email_provider || "hunter"}
                  onValueChange={(value) => updateSetting("email_provider", value)}
                >
                  <SelectTrigger id="email_provider" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hunter">Hunter.io</SelectItem>
                    <SelectItem value="rocketreach">RocketReach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min_results" className="text-sm">Min Results</Label>
                <Input
                  id="min_results"
                  type="number"
                  min="1"
                  max="100"
                  className="h-9"
                  value={settings.min_results || 10}
                  onChange={(e) => updateSetting("min_results", parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_results" className="text-sm">Max Results</Label>
                <Input
                  id="max_results"
                  type="number"
                  min="1"
                  max="1000"
                  className="h-9"
                  value={settings.max_results || 50}
                  onChange={(e) => updateSetting("max_results", parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min_match_score" className="text-sm">Match Score (%)</Label>
                <Input
                  id="min_match_score"
                  type="number"
                  min="0"
                  max="100"
                  className="h-9"
                  value={settings.default_min_match_score || 70}
                  onChange={(e) => updateSetting("default_min_match_score", parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSaveSettings} 
            disabled={saving} 
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface APIKeyInputProps {
  service: ServiceStatus;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisible: () => void;
}

function APIKeyInput({ service, value, onChange, isVisible, onToggleVisible }: APIKeyInputProps) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-secondary">{service.icon}</div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{service.name}</p>
              <Badge variant="secondary" className="text-xs mt-1">{service.cost}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => window.open(getServiceLink(service.key), "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              type={isVisible ? "text" : "password"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${service.name} API key`}
              className="flex-1 h-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onToggleVisible}
            >
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getServiceLink(serviceKey: string): string {
  const links: Record<string, string> = {
    github_token: "https://github.com/settings/tokens",
    proxycurl_api_key: "https://nubela.co/proxycurl/",
    scrapingbee_api_key: "https://www.scrapingbee.com/",
    apify_api_key: "https://apify.com/",
    phantombuster_api_key: "https://phantombuster.com/",
    rapidapi_key: "https://rapidapi.com/",
    serpapi_key: "https://serpapi.com/",
    hunter_api_key: "https://hunter.io/",
    rocketreach_api_key: "https://rocketreach.co/",
    anthropic_api_key: "https://console.anthropic.com/",
    stackoverflow_api_key: "https://stackapps.com/apps/oauth/register",
  };
  return links[serviceKey] || "https://google.com";
}
