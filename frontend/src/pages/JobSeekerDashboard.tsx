import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  TrendingUp,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const JobSeekerDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalApplications: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    potentialCount: 0,
    activeMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get candidate profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id, name")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setUserName(profile.name);

      // Get application stats
      const { data: applications, error } = await supabase
        .from("applications")
        .select("hiring_status")
        .eq("candidate_id", profile.id);

      if (error) throw error;

      const acceptedCount = applications?.filter(app => app.hiring_status === "accepted").length || 0;
      const rejectedCount = applications?.filter(app => app.hiring_status === "rejected").length || 0;
      const potentialCount = applications?.filter(app => app.hiring_status === "potential_fit").length || 0;

      // Get open job postings count (active matches)
      const { count: jobCount } = await supabase
        .from("job_postings")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      setStats({
        totalApplications: applications?.length || 0,
        acceptedCount,
        rejectedCount,
        potentialCount,
        activeMatches: jobCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow animate-pulse">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Welcome back, {userName}!</h2>
              <p className="text-muted-foreground">Your AI agent found <span className="text-primary font-semibold">{stats.activeMatches} job matches</span></p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Active Matches
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-gradient">{loading ? "..." : stats.activeMatches}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>Open job postings</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/30 bg-gradient-to-br from-secondary/10 via-card to-card hover:shadow-glow-purple transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-secondary" />
                Applications Sent
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-gradient">{loading ? "..." : stats.totalApplications}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>{stats.acceptedCount} accepted</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card hover:shadow-glow-cyan transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Potential Fit
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-gradient">{loading ? "..." : stats.potentialCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-warning text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>Under consideration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Matches */}
            <Card className="border-border/60 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-white" />
                      </div>
                      Top Job Matches
                    </CardTitle>
                    <CardDescription>AI-curated opportunities tailored to your profile</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/applications">
                      View Applications
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {stats.totalApplications === 0 
                      ? "No applications yet. Start applying to jobs!" 
                      : `You have ${stats.totalApplications} applications. View details in the Applications page.`}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="hero" size="sm" asChild>
                      <Link to="/discover">
                        <Briefcase className="mr-2 h-4 w-4" />
                        Discover Jobs
                      </Link>
                    </Button>
                    {stats.totalApplications > 0 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/applications">
                          <FileText className="mr-2 h-4 w-4" />
                          View Applications
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Strength */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Profile Strength
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                    <span className="text-3xl font-bold text-gradient">92%</span>
                  </div>
                  <Progress value={92} className="h-3 bg-muted" />
                </div>
                <div className="space-y-2">
                  <Button variant="hero" className="w-full shadow-md" asChild>
                    <Link to="/profile-assistant">
                      <Sparkles className="mr-2 h-4 w-4" />
                      ProfilePal AI
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/profile">
                      Edit Profile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/60 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Applied to TechCorp</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">New match found</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">CV tailored</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSeekerDashboard;
