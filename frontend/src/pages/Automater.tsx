import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Bot,
  Globe,
  Zap,
  RefreshCw,
} from "lucide-react";

type CandidatePreferences = {
  auto_apply_enabled: boolean;
  auto_apply_min_score: number;
  max_applications_per_day: number;
  refine_cv_enabled: boolean;
};

const Automater = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [refineCvEnabled, setRefineCvEnabled] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [maxAppsPerDay, setMaxAppsPerDay] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  // Load user preferences
  useEffect(() => {
    if (!user) return;
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);

      // First get the candidate profile ID
      const { data: profile, error: profileError } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (profileError || !profile) {
        console.error("Error loading profile:", profileError);
        return;
      }

      setCandidateId(profile.id);

      // Load candidate preferences
      const { data: prefs, error: prefsError } = await supabase
        .from("candidate_preferences")
        .select("*")
        .eq("candidate_id", profile.id)
        .maybeSingle();

      if (!prefsError && prefs) {
        setAutoApplyEnabled(prefs.auto_apply_enabled);
        setRefineCvEnabled((prefs as any).refine_cv_enabled ?? true);
        setMinScore(prefs.min_match_threshold);
        setMaxAppsPerDay(prefs.max_applications_per_day);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load automation preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!candidateId) {
      toast({
        title: "Error",
        description: "Profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("candidate_preferences")
        .upsert({
          candidate_id: candidateId,
          auto_apply_enabled: autoApplyEnabled,
          refine_cv_enabled: refineCvEnabled,
          min_match_threshold: minScore,
          max_applications_per_day: maxAppsPerDay,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation preferences saved",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunManualMatch = async () => {
    if (!candidateId) {
      toast({
        title: "Error",
        description: "Profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-apply-cron-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Matching complete: ${result.matchesFound} matches found, ${result.applicationsSubmitted} applications submitted`,
        });
      } else {
        throw new Error(result.error || "Matching failed");
      }
    } catch (error) {
      console.error("Error running manual match:", error);
      toast({
        title: "Error",
        description: "Failed to run matching",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Smart Job Application Automater</h1>
              <p className="text-muted-foreground">AI-powered automatic job matching and application</p>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Smart Matching</CardTitle>
              </div>
              <CardDescription>AI analyzes your profile and finds perfect matches</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Automatic Apply</CardTitle>
              </div>
              <CardDescription>Submits applications automatically based on your settings</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Daily Runs</CardTitle>
              </div>
              <CardDescription>Runs every day at 2 AM UTC to find new matches</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Automation Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>
              Control how the system automatically applies to jobs for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p>Loading your preferences...</p>
              </div>
            ) : (
              <>
                {/* Auto-Apply Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/60">
                  <div>
                    <p className="font-medium">Enable Auto-Apply</p>
                    <p className="text-sm text-muted-foreground">
                      Allow the system to automatically submit applications that match your profile
                    </p>
                  </div>
                  <Toggle
                    pressed={autoApplyEnabled}
                    onPressedChange={setAutoApplyEnabled}
                    className="ml-4"
                  />
                </div>

                {/* Refine CV Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/60">
                  <div>
                    <p className="font-medium">Refine CV for Each Job</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically tailor your CV to match each job's requirements for better fit
                    </p>
                  </div>
                  <Toggle
                    pressed={refineCvEnabled}
                    onPressedChange={setRefineCvEnabled}
                    className="ml-4"
                    disabled={!autoApplyEnabled}
                  />
                </div>

                {/* Minimum Score Setting */}
                <div className="space-y-2">
                  <Label htmlFor="minScore">Minimum Match Score: {minScore}</Label>
                  <input
                    id="minScore"
                    type="range"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only apply to jobs with match score of {minScore} or higher
                  </p>
                </div>

                {/* Daily Limit Setting */}
                <div className="space-y-2">
                  <Label htmlFor="maxApps">Max Applications Per Day: {maxAppsPerDay}</Label>
                  <input
                    id="maxApps"
                    type="range"
                    min="1"
                    max="20"
                    value={maxAppsPerDay}
                    onChange={(e) => setMaxAppsPerDay(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum {maxAppsPerDay} automatic applications per day to avoid spam
                  </p>
                </div>

                {/* Save and Test Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSavePreferences}
                    disabled={saving || !candidateId}
                    className="flex-1 gap-2"
                  >
                    {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                  <Button
                    onClick={handleRunManualMatch}
                    disabled={saving || !autoApplyEnabled || !candidateId}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Run Matching Now
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">How Automatic Matching Works</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="font-semibold">1.</span> System analyzes your profile and skills</li>
                  <li className="flex gap-2"><span className="font-semibold">2.</span> AI compares job postings to your profile</li>
                  <li className="flex gap-2"><span className="font-semibold">3.</span> Matches scoring above your threshold</li>
                  <li className="flex gap-2"><span className="font-semibold">4.</span> Automatic applications respecting daily limits</li>
                  <li className="flex gap-2"><span className="font-semibold">5.</span> You review and control everything</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Automater;
