import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Target, Briefcase, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface ApplicationStats {
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageScore: number;
}

interface JobPostingStats {
  job_title: string;
  application_count: number;
}

interface SearchStats {
  total_searches: number;
  total_candidates_found: number;
  avg_match_score: number;
}

const Statistics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats>({ totalApplications: 0, acceptedApplications: 0, rejectedApplications: 0, pendingApplications: 0, averageScore: 0 });
  const [topJobs, setTopJobs] = useState<JobPostingStats[]>([]);
  const [searchStats, setSearchStats] = useState<SearchStats>({ total_searches: 0, total_candidates_found: 0, avg_match_score: 0 });
  const [timelineData, setTimelineData] = useState<any[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const { data: recruiterProfile, error: recruiterError } = await supabase.from("recruiter_profiles").select("id").single();
      if (recruiterError) throw recruiterError;

      const [applicationsResult, jobsResult, searchesResult] = await Promise.all([
        supabase.from("applications").select(`id, hiring_status, final_score, created_at, job_postings!inner(recruiter_id)`).eq("job_postings.recruiter_id", recruiterProfile.id),
        supabase.from("job_postings").select(`job_title, applications(id)`).eq("recruiter_id", recruiterProfile.id).limit(10),
        supabase.from("headhunt_searches").select("total_found, results").eq("recruiter_id", recruiterProfile.id).eq("search_completed", true),
      ]);

      if (applicationsResult.data) {
        const apps = applicationsResult.data;
        const accepted = apps.filter((a: any) => a.hiring_status === "accepted").length;
        const rejected = apps.filter((a: any) => a.hiring_status === "rejected").length;
        const pending = apps.filter((a: any) => a.hiring_status === "potential_fit").length;
        const avgScore = apps.length > 0 ? apps.reduce((sum: number, a: any) => sum + (a.final_score || 0), 0) / apps.length : 0;

        setApplicationStats({ totalApplications: apps.length, acceptedApplications: accepted, rejectedApplications: rejected, pendingApplications: pending, averageScore: Math.round(avgScore) });

        const last7Days = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - (6 - i)); return date.toISOString().split('T')[0]; });
        const timeline = last7Days.map(date => {
          const dayApps = apps.filter((a: any) => a.created_at.startsWith(date));
          return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), applications: dayApps.length, accepted: dayApps.filter((a: any) => a.hiring_status === "accepted").length };
        });
        setTimelineData(timeline);
      }

      if (jobsResult.data) {
        const jobStats = jobsResult.data.map((job: any) => ({ job_title: job.job_title, application_count: job.applications?.length || 0 })).filter((job: any) => job.application_count > 0).sort((a: any, b: any) => b.application_count - a.application_count).slice(0, 5);
        setTopJobs(jobStats);
      }

      if (searchesResult.data && searchesResult.data.length > 0) {
        const searches = searchesResult.data;
        const totalFound = searches.reduce((sum: number, s: any) => sum + (s.total_found || 0), 0);
        let totalScores = 0, scoreCount = 0;
        searches.forEach((s: any) => { if (s.results && Array.isArray(s.results)) { s.results.forEach((r: any) => { if (r.match_score) { totalScores += r.match_score; scoreCount++; } }); } });
        setSearchStats({ total_searches: searches.length, total_candidates_found: totalFound, avg_match_score: scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0 });
      }
    } catch (error: any) {
      console.error("Error fetching statistics:", error);
      toast({ title: "Error", description: "Failed to load statistics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: "Potential Fit", value: applicationStats.pendingApplications, color: "hsl(var(--warning))" },
    { name: "Accepted", value: applicationStats.acceptedApplications, color: "hsl(var(--success))" },
    { name: "Rejected", value: applicationStats.rejectedApplications, color: "hsl(var(--destructive))" },
  ];

  if (loading) {
    return <RecruiterLayout><div className="container mx-auto px-4 py-6 space-y-6"><Skeleton className="h-20 w-full" /><div className="grid md:grid-cols-3 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-96 w-full" /></div></RecruiterLayout>;
  }

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"><BarChart3 className="h-6 w-6 text-white" /></div>
          <div><h2 className="text-3xl font-bold">Recruitment Analytics</h2><p className="text-muted-foreground">Insights and performance metrics</p></div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" />Total Applications</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{applicationStats.totalApplications}</p><p className="text-xs text-muted-foreground mt-1">All time</p></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" />Average Score</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{applicationStats.averageScore}%</p><p className="text-xs text-muted-foreground mt-1">Match quality</p></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-sm"><Target className="h-4 w-4" />Headhunt Searches</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{searchStats.total_searches}</p><p className="text-xs text-muted-foreground mt-1">{searchStats.total_candidates_found} candidates found</p></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardDescription className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-success" />Acceptance Rate</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{applicationStats.totalApplications > 0 ? Math.round((applicationStats.acceptedApplications / applicationStats.totalApplications) * 100) : 0}%</p><p className="text-xs text-muted-foreground mt-1">{applicationStats.acceptedApplications} accepted</p></CardContent></Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3"><TabsTrigger value="applications">Applications</TabsTrigger><TabsTrigger value="jobs">Top Jobs</TabsTrigger><TabsTrigger value="headhunt">Headhunt</TabsTrigger></TabsList>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Applications Over Time</CardTitle><CardDescription>Last 7 days activity</CardDescription></CardHeader>
              <CardContent>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Applications" />
                      <Line type="monotone" dataKey="accepted" stroke="hsl(var(--success))" strokeWidth={2} name="Accepted" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No application data available</p></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Application Status Distribution</CardTitle><CardDescription>Current status breakdown</CardDescription></CardHeader>
              <CardContent>
                {applicationStats.totalApplications > 0 ? (
                  <div className="flex items-center gap-8">
                    <ResponsiveContainer width="50%" height={250}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={false}>
                          {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-warning" /><div><p className="font-semibold">{applicationStats.pendingApplications}</p><p className="text-xs text-muted-foreground">Potential Fit</p></div></div>
                      <div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-success" /><div><p className="font-semibold">{applicationStats.acceptedApplications}</p><p className="text-xs text-muted-foreground">Accepted</p></div></div>
                      <div className="flex items-center gap-3"><XCircle className="h-5 w-5 text-destructive" /><div><p className="font-semibold">{applicationStats.rejectedApplications}</p><p className="text-xs text-muted-foreground">Rejected</p></div></div>
                    </div>
                  </div>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground"><p>No applications yet</p></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Top Job Postings</CardTitle><CardDescription>Jobs ranked by application count</CardDescription></CardHeader>
              <CardContent>
                {topJobs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topJobs} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="job_title" type="category" width={150} className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="application_count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} name="Applications" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[400px] flex items-center justify-center text-muted-foreground"><div className="text-center"><Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No job postings with applications yet</p></div></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headhunt">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Headhunt Performance</CardTitle><CardDescription>External candidate sourcing metrics</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <div><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Total Searches</span><span className="text-2xl font-bold">{searchStats.total_searches}</span></div></div>
                  <div><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Candidates Found</span><span className="text-2xl font-bold">{searchStats.total_candidates_found}</span></div></div>
                  <div><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Avg Match Score</span><span className="text-2xl font-bold">{searchStats.avg_match_score}%</span></div></div>
                  {searchStats.total_searches > 0 && <div><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Avg per Search</span><span className="text-2xl font-bold">{Math.round(searchStats.total_candidates_found / searchStats.total_searches)}</span></div></div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Insights</CardTitle><CardDescription>Key takeaways from your data</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {applicationStats.totalApplications > 0 && <div className="p-4 rounded-lg bg-primary/5 border border-primary/20"><p className="font-semibold text-sm mb-1">Application Quality</p><p className="text-xs text-muted-foreground">Your average match score is {applicationStats.averageScore}%, indicating {applicationStats.averageScore >= 80 ? "excellent" : applicationStats.averageScore >= 60 ? "good" : "moderate"} candidate fit quality.</p></div>}
                  {searchStats.total_searches > 0 && <div className="p-4 rounded-lg bg-accent/5 border border-accent/20"><p className="font-semibold text-sm mb-1">Headhunt Success</p><p className="text-xs text-muted-foreground">You've found {searchStats.total_candidates_found} external candidates through {searchStats.total_searches} searches, averaging {Math.round(searchStats.total_candidates_found / searchStats.total_searches)} candidates per search.</p></div>}
                  {applicationStats.acceptedApplications > 0 && <div className="p-4 rounded-lg bg-success/5 border border-success/20"><p className="font-semibold text-sm mb-1">Hiring Progress</p><p className="text-xs text-muted-foreground">{applicationStats.acceptedApplications} candidates accepted out of {applicationStats.totalApplications} applications ({Math.round((applicationStats.acceptedApplications / applicationStats.totalApplications) * 100)}% acceptance rate).</p></div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RecruiterLayout>
  );
};

export default Statistics;
