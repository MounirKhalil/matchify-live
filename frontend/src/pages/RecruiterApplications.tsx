import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Search, Mail, Phone, MapPin, Award, GraduationCap, Briefcase, Bookmark, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JobPosting {
  id: string;
  job_title: string;
  status: string;
}

interface Application {
  id: string;
  hiring_status: string;
  final_score: number | null;
  experience_score: number | null;
  skills_score: number | null;
  education_score: number | null;
  created_at: string;
  candidate_profiles: {
    id: string;
    name: string;
    family_name: string;
    email: string;
    phone_number: string | null;
    location: string | null;
    cv_url: string | null;
    bookmarked_by: string[] | null;
    profile_image_url: string | null;
  };
}

const RecruiterApplications = () => {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(false);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch recruiter's job postings
  useEffect(() => {
    const fetchJobPostings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      setRecruiterId(profile.id);

      const { data, error } = await supabase
        .from("job_postings")
        .select("id, job_title, status")
        .eq("recruiter_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load job postings",
          variant: "destructive",
        });
        return;
      }

      setJobPostings(data || []);
    };

    fetchJobPostings();
  }, [toast]);

  // Fetch applications for selected job
  useEffect(() => {
    if (!selectedJobId) {
      setApplications([]);
      setFilteredApplications([]);
      return;
    }

    const fetchApplications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          hiring_status,
          final_score,
          experience_score,
          skills_score,
          education_score,
          created_at,
          candidate_profiles (
            id,
            name,
            family_name,
            email,
            phone_number,
            location,
            cv_url,
            bookmarked_by,
            profile_image_url
          )
        `)
        .eq("job_posting_id", selectedJobId)
        .order("created_at", { ascending: false });

      setLoading(false);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load applications",
          variant: "destructive",
        });
        return;
      }

      setApplications(data as any || []);
      setFilteredApplications(data as any || []);
    };

    fetchApplications();
  }, [selectedJobId, toast]);

  // Filter applications based on search, status, and score
  useEffect(() => {
    let filtered = applications;

    if (searchQuery) {
      filtered = filtered.filter((app) =>
        `${app.candidate_profiles.name} ${app.candidate_profiles.family_name} ${app.candidate_profiles.email}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.hiring_status === statusFilter);
    }

    // Filter by score range
    filtered = filtered.filter((app) => {
      const score = app.final_score || 0;
      return score >= scoreRange[0] && score <= scoreRange[1];
    });

    // Sort by date
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredApplications(filtered);
  }, [searchQuery, statusFilter, scoreRange, sortBy, applications]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      accepted: "bg-green-500 text-white",
      potential_fit: "bg-orange-500 text-white",
      interviewing: "bg-orange-500 text-white",
      offer_extended: "bg-green-500 text-white",
      hired: "bg-green-500 text-white",
      rejected: "bg-red-500 text-white",
    };
    return colors[status] || "bg-gray-500 text-white";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      accepted: "Accepted",
      potential_fit: "Potential Fit",
      interviewing: "Interviewing",
      offer_extended: "Accepted",
      hired: "Accepted",
      rejected: "Rejected",
    };
    return texts[status] || status;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Less than 1 hour ago";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const toggleBookmark = async (candidateId: string, currentBookmarks: string[] | null) => {
    if (!recruiterId) return;

    const bookmarks = currentBookmarks || [];
    const isBookmarked = bookmarks.includes(recruiterId);
    const newBookmarks = isBookmarked
      ? bookmarks.filter((id) => id !== recruiterId)
      : [...bookmarks, recruiterId];

    try {
      const { error } = await supabase
        .from("candidate_profiles")
        .update({ bookmarked_by: newBookmarks })
        .eq("id", candidateId);

      if (error) throw error;

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.candidate_profiles.id === candidateId
            ? {
                ...app,
                candidate_profiles: {
                  ...app.candidate_profiles,
                  bookmarked_by: newBookmarks,
                },
              }
            : app
        )
      );

      toast({
        title: isBookmarked ? "Bookmark removed" : "Bookmark added",
        description: isBookmarked
          ? "Candidate removed from your bookmarks"
          : "Candidate added to your bookmarks",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    }
  };

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
            <Inbox className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Applications</h2>
            <p className="text-muted-foreground">Manage all candidate applications</p>
          </div>
        </div>

        {/* Job Posting Selector */}
        <Card className="mb-6 border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle>Select Job Posting</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a job posting to view applications" />
              </SelectTrigger>
              <SelectContent>
                {jobPostings.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_title} - {job.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedJobId ? (
          <>
            {/* Search and Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card border-border/60"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                {/* Score Range Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="bg-card border-border/60">
                      Score: {scoreRange[0]}-{scoreRange[1]}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Final Score Range</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select minimum and maximum score range
                        </p>
                      </div>
                      <div className="space-y-4">
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={scoreRange}
                          onValueChange={(value) => setScoreRange(value as [number, number])}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm">
                          <span>Min: {scoreRange[0]}</span>
                          <span>Max: {scoreRange[1]}</span>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as "newest" | "oldest")}>
                  <SelectTrigger className="w-[150px] bg-card border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-card border-border/60">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="potential_fit">Potential Fit</SelectItem>
                    <SelectItem value="interviewing">Interviewing</SelectItem>
                    <SelectItem value="offer_extended">Offer Extended</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Applications Count */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Applications ({filteredApplications.length})
              </h3>
            </div>

            {/* Applications Grid */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <Card className="border-border/60 shadow-xl">
                <CardContent className="py-12 text-center">
                  <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Applications Found</h3>
                  <p className="text-muted-foreground">
                    {applications.length === 0
                      ? "No candidates have applied to this job posting yet."
                      : "No applications match your search criteria."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredApplications.map((app) => (
                  <Card key={app.id} className="border-border/60 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                      {/* Header with Avatar, Name and Status */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage 
                            src={app.candidate_profiles.profile_image_url || undefined} 
                            alt={`${app.candidate_profiles.name} ${app.candidate_profiles.family_name}`}
                            loading="lazy"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                            {app.candidate_profiles.name?.[0]}{app.candidate_profiles.family_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">
                            {app.candidate_profiles.name} {app.candidate_profiles.family_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Applied {getTimeAgo(app.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge className={getStatusColor(app.hiring_status)}>
                            {getStatusText(app.hiring_status)}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => toggleBookmark(app.candidate_profiles.id, app.candidate_profiles.bookmarked_by)}
                          >
                            <Bookmark 
                              className={`h-4 w-4 ${
                                app.candidate_profiles.bookmarked_by?.includes(recruiterId || "") 
                                  ? "fill-current text-primary" 
                                  : ""
                              }`} 
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{app.candidate_profiles.email}</span>
                        </div>
                        {app.candidate_profiles.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{app.candidate_profiles.phone_number}</span>
                          </div>
                        )}
                        {app.candidate_profiles.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{app.candidate_profiles.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Scores */}
                      <div className="border-t border-border pt-4 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                          {app.final_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Final Score</div>
                              <div className="flex items-center gap-1 font-semibold text-lg">
                                <Award className="h-4 w-4 text-primary" />
                                {app.final_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {app.experience_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Experience</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <Briefcase className="h-4 w-4 text-blue-500" />
                                {app.experience_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {app.education_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Education</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <GraduationCap className="h-4 w-4 text-purple-500" />
                                {app.education_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {app.skills_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Skills</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <Award className="h-4 w-4 text-green-500" />
                                {app.skills_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions - View CV button only */}
                      <div className="mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (app.candidate_profiles.cv_url) {
                              window.open(app.candidate_profiles.cv_url, "_blank");
                            }
                          }}
                          disabled={!app.candidate_profiles.cv_url}
                          className="w-full"
                        >
                          View CV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card className="border-border/60 shadow-xl">
            <CardContent className="py-24 text-center">
              <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Select a Job Posting</h3>
              <p className="text-muted-foreground">
                Choose a job posting from the dropdown above to view applications.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterApplications;