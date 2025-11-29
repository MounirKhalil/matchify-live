import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Filter,
  MapPin,
  Search,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfilePalAPIService } from "@/services/profile-pal-api.service";

type Requirement = {
  requirement: string;
  priority: "must" | "nice-to-have";
};

type JobPosting = {
  id: string;
  job_title: string;
  public_information: string | null;
  categories: string[];
  requirements: Requirement[] | null;
  created_at: string;
  status: string;
};

const DiscoverJobs = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_postings")
        .select("id, job_title, public_information, categories, requirements, created_at, status")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs((data || []) as JobPosting[]);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load job postings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    setApplying(jobId);
    try {
      const result = await ProfilePalAPIService.applyToJob(jobId);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        throw new Error(result.error || "Failed to apply");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply to job",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Discover Jobs</h1>
          <p className="text-muted-foreground text-lg">Find your next opportunity from thousands of job listings</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="parttime">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="sf">San Francisco</SelectItem>
                    <SelectItem value="ny">New York</SelectItem>
                    <SelectItem value="austin">Austin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum Match</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="90">90%+</SelectItem>
                    <SelectItem value="80">80%+</SelectItem>
                    <SelectItem value="70">70%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full">
                Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs by title, company, or keywords..."
                    className="pl-10 h-12 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Recommendations */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Recommended for You
                  </h3>
                  <p className="text-sm text-muted-foreground">Jobs that match your profile and preferences</p>
                </div>
                <Badge variant="secondary" className="shadow-sm">{jobs.length} jobs found</Badge>
              </div>

              {loading ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Loading job postings...
                </div>
              ) : jobs.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No job postings available at the moment
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {jobs.map((job) => (
                    <Card key={job.id} className="border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <CardContent className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md flex-shrink-0">
                            <Briefcase className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base leading-tight line-clamp-2 mb-2">{job.job_title}</h3>
                          </div>
                        </div>

                        {job.public_information && (
                          <p className="text-xs text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                            {job.public_information}
                          </p>
                        )}

                        {job.categories && job.categories.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mb-4">
                            {job.categories.slice(0, 3).map((category, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20 px-2 py-0.5">
                                {category}
                              </Badge>
                            ))}
                            {job.categories.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{job.categories.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {job.requirements && job.requirements.length > 0 && (
                          <div className="mb-4 space-y-1.5">
                            <p className="text-xs font-semibold">Requirements:</p>
                            <ul className="space-y-1">
                              {job.requirements.slice(0, 3).map((req, idx) => (
                                <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <Badge 
                                    variant={req.priority === "must" ? "default" : "secondary"} 
                                    className="text-[9px] px-1 py-0 mt-0.5 flex-shrink-0"
                                  >
                                    {req.priority === "must" ? "Must" : "Nice"}
                                  </Badge>
                                  <span className="flex-1 line-clamp-2">{req.requirement}</span>
                                </li>
                              ))}
                              {job.requirements.length > 3 && (
                                <li className="text-[10px] text-muted-foreground ml-1">
                                  +{job.requirements.length - 3} more requirements
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        <div className="mt-auto pt-4 border-t space-y-2">
                          <p className="text-[10px] text-muted-foreground">Posted {getTimeSince(job.created_at)}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                              <FileText className="mr-1.5 h-3 w-3" />
                              Details
                            </Button>
                            <Button
                              variant="hero"
                              size="sm"
                              className="flex-1 text-xs h-8 shadow-md"
                              onClick={() => handleApply(job.id)}
                              disabled={applying === job.id}
                            >
                              <CheckCircle2 className="mr-1.5 h-3 w-3" />
                              {applying === job.id ? "Applying..." : "Apply"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverJobs;
