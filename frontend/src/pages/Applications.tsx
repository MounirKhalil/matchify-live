import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Briefcase,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Application = {
  id: string;
  created_at: string;
  education_score: number;
  experience_score: number;
  skills_score: number;
  final_score: number;
  hiring_status: string;
  job_posting: {
    id: string;
    job_title: string;
    public_information: string | null;
    categories: string[];
    recruiter_profile: {
      organization_name: string;
    };
  };
};

const Applications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Application["job_posting"] | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get candidate profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Fetch applications with job posting details
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          created_at,
          education_score,
          experience_score,
          skills_score,
          final_score,
          hiring_status,
          job_posting:job_postings (
            id,
            job_title,
            public_information,
            categories,
            recruiter_profile:recruiter_profiles (
              organization_name
            )
          )
        `)
        .eq("candidate_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  const handleViewJobDetails = (jobPosting: Application["job_posting"]) => {
    setSelectedJob(jobPosting);
    setJobDetailsOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">My Applications</h1>
          <p className="text-muted-foreground text-lg">Track your job applications and their evaluation status</p>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : applications.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-accent/30">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-foreground" />
                Under Review
              </CardDescription>
              <CardTitle className="text-3xl text-accent-foreground">{loading ? "..." : applications.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No applications found
            </div>
          ) : (
            applications.map((application) => (
                <Card key={application.id} className="border-border/60 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
                          <Briefcase className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-xl">{application.job_posting.job_title}</h3>
                          </div>
                          <p className="text-muted-foreground mb-2">
                            {application.job_posting.recruiter_profile.organization_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Applied {getTimeSince(application.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {application.job_posting.categories && application.job_posting.categories.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-4">
                        {application.job_posting.categories.map((category, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewJobDetails(application.job_posting)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Job Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob?.job_title}</DialogTitle>
            <DialogDescription>
              {selectedJob?.recruiter_profile?.organization_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedJob?.categories && selectedJob.categories.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Categories</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedJob.categories.map((category, i) => (
                    <Badge key={i} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedJob?.public_information && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Job Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedJob.public_information}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Applications;
