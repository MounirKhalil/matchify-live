import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  TrendingUp,
  Search,
  FileText,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  activeJobs: number;
  totalApplications: number;
  recentApplications: number;
  headhuntSearches: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
}

interface RecentApplication {
  id: string;
  candidate_name: string;
  job_title: string;
  final_score: number;
  hiring_status: string;
  created_at: string;
}

const RecruiterDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    totalApplications: 0,
    recentApplications: 0,
    headhuntSearches: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: recruiterProfile, error: recruiterError } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .single();

      if (recruiterError) throw recruiterError;

      const [jobsResult, applicationsResult, recentAppsResult, searchesResult, statusCountsResult] = await Promise.all([
        supabase.from("job_postings").select("id", { count: "exact" }).eq("recruiter_id", recruiterProfile.id).eq("status", "open"),
        supabase.from("applications").select("id", { count: "exact" }),
        supabase.from("applications").select(`id, final_score, hiring_status, created_at, candidate_profiles!applications_candidate_id_fkey(name, family_name), job_postings!applications_job_posting_id_fkey(job_title)`).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(5),
        supabase.from("headhunt_searches").select("id", { count: "exact" }).eq("recruiter_id", recruiterProfile.id),
        supabase.from("applications").select("hiring_status"),
      ]);

      const statusCounts = { pending: 0, accepted: 0, rejected: 0 };
      if (statusCountsResult.data) {
        statusCountsResult.data.forEach((app: any) => {
          if (app.hiring_status === "potential_fit") statusCounts.pending++;
          else if (app.hiring_status === "accepted") statusCounts.accepted++;
          else if (app.hiring_status === "rejected") statusCounts.rejected++;
        });
      }

      setStats({
        activeJobs: jobsResult.count || 0,
        totalApplications: applicationsResult.count || 0,
        recentApplications: recentAppsResult.data?.length || 0,
        headhuntSearches: searchesResult.count || 0,
        pendingApplications: statusCounts.pending,
        acceptedApplications: statusCounts.accepted,
        rejectedApplications: statusCounts.rejected,
      });

      if (recentAppsResult.data) {
        const formattedApps = recentAppsResult.data.map((app: any) => ({
          id: app.id,
          candidate_name: `${app.candidate_profiles?.name || ''} ${app.candidate_profiles?.family_name || ''}`.trim(),
          job_title: app.job_postings?.job_title || 'Unknown Position',
          final_score: app.final_score || 0,
          hiring_status: app.hiring_status,
          created_at: app.created_at,
        }));
        setRecentApplications(formattedApps);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Potential Fit</Badge>;
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid md:grid-cols-3 gap-5"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Recruiter Dashboard</h2>
              <p className="text-muted-foreground">
                {stats.recentApplications > 0 ? <span><span className="text-primary font-semibold">{stats.recentApplications} new applications</span> this week</span> : <span>Welcome back! Here's your recruitment overview</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-primary" />Active Jobs</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.activeJobs}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/recruiter/job-postings"><Button variant="link" size="sm" className="p-0 h-auto text-xs">View all jobs <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-secondary" />Total Applications</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.totalApplications}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/recruiter/applications"><Button variant="link" size="sm" className="p-0 h-auto text-xs">Review applications <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-accent" />Headhunt Searches</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.headhuntSearches}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/recruiter/headhunting"><Button variant="link" size="sm" className="p-0 h-auto text-xs">Start new search <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
            </CardContent>
          </Card>

          <Card className="border-border/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" />Potential Fit</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.pendingApplications}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/recruiter/statistics"><Button variant="link" size="sm" className="p-0 h-auto text-xs">View analytics <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm">Potential Fit</CardDescription>
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pendingApplications}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting decision</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm">Accepted</CardDescription>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.acceptedApplications}</p>
              <p className="text-xs text-muted-foreground mt-1">Moving forward</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm">Rejected</CardDescription>
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.rejectedApplications}</p>
              <p className="text-xs text-muted-foreground mt-1">Not a fit</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Recent Applications</CardTitle>
                <CardDescription className="mt-1">Latest candidate submissions</CardDescription>
              </div>
              <Link to="/recruiter/applications"><Button variant="outline" size="sm">View All<ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent applications</p>
                <p className="text-sm mt-2">New applications will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{app.candidate_name}</h4>
                        {getStatusBadge(app.hiring_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{app.job_title}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />Match Score: {app.final_score}%</span>
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link to="/recruiter/applications"><Button variant="ghost" size="sm">Review<ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterDashboard;
