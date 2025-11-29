import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Building2, Mail, FileText, Loader2, Search, Filter, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryFilterCombobox } from "@/components/CategoryFilterCombobox";
import { ProfilePalAPIService } from "@/services/profile-pal-api.service";

interface Requirement {
  requirement: string;
  priority: "must" | "nice-to-have";
}

interface JobPosting {
  id: string;
  job_title: string;
  public_information: string | null;
  description_url: string | null;
  public_job_description_file: boolean | null;
  categories: string[] | null;
  requirements: Requirement[] | null;
  recruiter: {
    organization_name: string;
    email: string;
  } | null;
}

const Opportunities = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [applyingJobs, setApplyingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      const { data, error } = await supabase
        .from("job_postings")
        .select(`
          id,
          job_title,
          public_information,
          description_url,
          public_job_description_file,
          categories,
          requirements,
          recruiter_id
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch recruiter profiles separately
      const recruiterIds = data?.map((job) => job.recruiter_id) || [];
      const { data: recruiters, error: recruiterError } = await supabase
        .from("recruiter_profiles")
        .select("id, organization_name, email")
        .in("id", recruiterIds);

      if (recruiterError) throw recruiterError;

      // Merge the data
      const jobsWithRecruiters = data?.map((job) => ({
        ...job,
        recruiter: recruiters?.find((r) => r.id === job.recruiter_id) || null,
      }));

      setJobs(jobsWithRecruiters as any);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load job opportunities. Please try again.",
        variant: "destructive",
      });
      console.error("Error fetching job postings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDescription = (url: string | null) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleApply = async (jobId: string, jobTitle: string) => {
    try {
      setApplyingJobs(prev => new Set(prev).add(jobId));
      
      const result = await ProfilePalAPIService.applyToJob(jobId);
      
      if (result.success) {
        toast({
          title: "Application Submitted!",
          description: `You've successfully applied for ${jobTitle}`,
        });
      } else {
        throw new Error(result.error || "Failed to submit application");
      }
    } catch (error: any) {
      console.error("Error applying to job:", error);
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === "" ||
      job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.recruiter?.organization_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      job.public_information?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || (job.categories || []).includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Job Opportunities</h1>
          <p className="text-muted-foreground text-lg">
            Browse available positions from all recruiters
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by job title, organization, or keywords..."
                      className="pl-10 h-12 text-base"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <CategoryFilterCombobox
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <span className="font-semibold text-foreground">{filteredJobs.length}</span> job
                opportunities
              </p>
            </div>

            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Check back later for new opportunities"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight line-clamp-2 mb-2">
                        {job.job_title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs mb-2">
                        Open Position
                      </Badge>
                      {/* Categories */}
                      {job.categories && job.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.categories.slice(0, 2).map((category) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {category}
                            </Badge>
                          ))}
                          {job.categories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.categories.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4">
                  {/* Organization Info */}
                  {job.recruiter ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          {job.recruiter.organization_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground truncate">
                          {job.recruiter.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Organization information not available
                    </div>
                  )}

                  {/* Public Information */}
                  {job.public_information && (
                    <div>
                      <CardDescription className="text-sm line-clamp-4">
                        {job.public_information}
                      </CardDescription>
                    </div>
                  )}

                  {/* Requirements */}
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Requirements:</p>
                      <ul className="space-y-1">
                        {job.requirements.map((req, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <Badge 
                              variant={req.priority === "must" ? "default" : "secondary"} 
                              className="text-[10px] px-1.5 py-0 mt-0.5 flex-shrink-0"
                            >
                              {req.priority === "must" ? "Must" : "Nice"}
                            </Badge>
                            <span className="flex-1">{req.requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t space-y-2">
                    {job.public_job_description_file && job.description_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleViewDescription(job.description_url)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Job Description
                      </Button>
                    )}
                    <Button 
                      variant="hero" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleApply(job.id, job.job_title)}
                      disabled={applyingJobs.has(job.id)}
                    >
                      {applyingJobs.has(job.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Opportunities;
