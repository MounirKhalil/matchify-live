import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Bookmark,
  FileText,
  MapPin,
  Briefcase,
  User,
  Mail,
  Phone,
  GraduationCap,
  Award,
  FolderOpen,
  Heart,
  Github,
  Linkedin,
  Link as LinkIcon,
  ExternalLink,
  Search,
  Filter,
  Eye,
  Clock,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

type CandidateProfile = Tables<"candidate_profiles">;

interface Application {
  id: string;
  job_posting_id: string;
  hiring_status: string;
  final_score: number | null;
  experience_score: number | null;
  skills_score: number | null;
  education_score: number | null;
  created_at: string;
  job_postings: {
    job_title: string;
  };
}

const BookmarkedCandidates = () => {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [inviteCandidate, setInviteCandidate] = useState<CandidateProfile | null>(null);
  const [inviteStep, setInviteStep] = useState(1);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [jobPostings, setJobPostings] = useState<Array<{ id: string; job_title: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [candidatesWithApplications, setCandidatesWithApplications] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<Map<string, Application>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    fetchBookmarkedCandidates();
  }, []);

  const fetchBookmarkedCandidates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setRecruiterId(profile.id);
      fetchJobPostings(profile.id);

      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .contains("bookmarked_by", [profile.id])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);

      // Fetch application data for candidates
      if (data && data.length > 0 && profile) {
        const candidateIds = data.map(c => c.id);
        const { data: apps } = await supabase
          .from("applications")
          .select(`
            id,
            candidate_id,
            job_posting_id,
            hiring_status,
            final_score,
            experience_score,
            skills_score,
            education_score,
            created_at,
            job_postings!inner(
              recruiter_id,
              job_title
            )
          `)
          .in("candidate_id", candidateIds)
          .eq("job_postings.recruiter_id", profile.id);

        if (apps) {
          const candidateIdsWithApps = new Set(apps.map(a => a.candidate_id));
          setCandidatesWithApplications(candidateIdsWithApps);
          
          // Map applications by candidate_id (store the most recent one)
          const appsMap = new Map<string, Application>();
          apps.forEach(app => {
            const existing = appsMap.get(app.candidate_id);
            if (!existing || new Date(app.created_at) > new Date(existing.created_at)) {
              appsMap.set(app.candidate_id, app as any);
            }
          });
          setApplications(appsMap);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookmarked candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobPostings = async (recruiterId: string) => {
    try {
      const { data, error } = await supabase
        .from("job_postings")
        .select("id, job_title")
        .eq("recruiter_id", recruiterId)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobPostings(data || []);
    } catch (error) {
      console.error("Error fetching job postings:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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

  const removeBookmark = async (candidateId: string, currentBookmarks: string[] | null) => {
    if (!recruiterId) return;

    const bookmarks = currentBookmarks || [];
    const newBookmarks = bookmarks.filter((id) => id !== recruiterId);

    try {
      const { error } = await supabase
        .from("candidate_profiles")
        .update({ bookmarked_by: newBookmarks })
        .eq("id", candidateId);

      if (error) throw error;

      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));

      toast({
        title: "Bookmark removed",
        description: "Candidate removed from your bookmarks",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const calculateExperience = (workExperience: any) => {
    if (!workExperience || workExperience.length === 0) return "No experience listed";
    
    const totalYears = workExperience.reduce((sum: number, exp: any) => {
      // Handle both old format (start_date/end_date) and new format (start_year/end_year)
      if (exp.start_year) {
        const startYear = parseInt(exp.start_year);
        const endYear = exp.is_present ? new Date().getFullYear() : (exp.end_year ? parseInt(exp.end_year) : new Date().getFullYear());
        return sum + (endYear - startYear);
      } else if (exp.start_date) {
        const start = new Date(exp.start_date);
        const end = exp.end_date ? new Date(exp.end_date) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return sum + years;
      }
      return sum;
    }, 0);

    return `${Math.round(totalYears)} years`;
  };

  // Get unique locations and jobs for filters
  const uniqueLocations = Array.from(new Set(candidates.map(c => c.location).filter(Boolean)));
  const uniqueJobs = Array.from(new Set(Array.from(applications.values()).map(a => a.job_posting_id)));
  const jobTitles = new Map(Array.from(applications.values()).map(a => [a.job_posting_id, a.job_postings.job_title]));

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.family_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.preferred_job_types?.some(type => type.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocation = locationFilter === "all" || candidate.location === locationFilter;
    
    const hasApplications = candidatesWithApplications.has(candidate.id);
    const matchesSource = 
      sourceFilter === "all" || 
      (sourceFilter === "search" && !hasApplications) ||
      (sourceFilter === "applications" && hasApplications);
    
    const application = applications.get(candidate.id);
    const matchesJob = 
      jobFilter === "all" || 
      !hasApplications ||
      (application && application.job_posting_id === jobFilter);
    
    return matchesSearch && matchesLocation && matchesSource && matchesJob;
  });

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
            <Bookmark className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Bookmarked Candidates</h2>
            <p className="text-muted-foreground">
              {filteredCandidates.length} of {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"} displayed
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        {candidates.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or job type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location!}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={sourceFilter === "all" ? "default" : "outline"}
                    onClick={() => setSourceFilter("all")}
                    size="sm"
                  >
                    All ({candidates.length})
                  </Button>
                  <Button
                    variant={sourceFilter === "search" ? "default" : "outline"}
                    onClick={() => setSourceFilter("search")}
                    size="sm"
                  >
                    From Search ({candidates.filter(c => !candidatesWithApplications.has(c.id)).length})
                  </Button>
                  <Button
                    variant={sourceFilter === "applications" ? "default" : "outline"}
                    onClick={() => setSourceFilter("applications")}
                    size="sm"
                  >
                    From Applications ({candidates.filter(c => candidatesWithApplications.has(c.id)).length})
                  </Button>
                </div>
                
                {/* Job Filter - only show when filtering by applications */}
                {sourceFilter === "applications" && uniqueJobs.length > 0 && (
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Filter by job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {uniqueJobs.map((jobId) => (
                        <SelectItem key={jobId} value={jobId}>
                          {jobTitles.get(jobId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredCandidates.length === 0 && candidates.length === 0 ? (
          <Card className="border-border/60 shadow-xl">
            <CardContent className="py-24 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Bookmarked Candidates</h3>
              <p className="text-muted-foreground">
                Start bookmarking candidates from the search page to keep track of them.
              </p>
            </CardContent>
          </Card>
        ) : filteredCandidates.length === 0 ? (
          <Card className="border-border/60 shadow-xl">
            <CardContent className="py-24 text-center">
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Matching Candidates</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find candidates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => {
              const isBookmarked = candidate.bookmarked_by?.includes(recruiterId || "");
              const workExperience = candidate.work_experience as any[];
              const application = applications.get(candidate.id);
              const hasApplication = candidatesWithApplications.has(candidate.id);
              
              // Application Card (for candidates from applications)
              if (hasApplication && application) {
                return (
                  <Card key={candidate.id} className="border-border/60 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      {/* Header with Avatar, Name and Status */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={(candidate as any).profile_image_url} 
                            alt={`${candidate.name} ${candidate.family_name}`}
                            loading="lazy"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                            {candidate.name?.[0]}{candidate.family_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1">
                            {candidate.name} {candidate.family_name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Clock className="h-3 w-3" />
                            <span>Applied {getTimeAgo(application.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(application.hiring_status)}>
                            {getStatusText(application.hiring_status)}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => removeBookmark(candidate.id, candidate.bookmarked_by)}
                          >
                            <Bookmark className="h-5 w-5 fill-current text-primary" />
                          </Button>
                        </div>
                      </div>

                      {/* Job Title */}
                      <div className="mb-4 p-2 bg-accent/10 rounded-lg">
                        <p className="text-sm font-medium text-accent">{application.job_postings.job_title}</p>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{candidate.email}</span>
                        </div>
                        {candidate.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{candidate.phone_number}</span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Scores */}
                      <div className="border-t border-border pt-4 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                          {application.final_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Final Score</div>
                              <div className="flex items-center gap-1 font-semibold text-lg">
                                <Award className="h-4 w-4 text-primary" />
                                {application.final_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {application.experience_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Experience</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <Briefcase className="h-4 w-4 text-blue-500" />
                                {application.experience_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {application.education_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Education</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <GraduationCap className="h-4 w-4 text-purple-500" />
                                {application.education_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {application.skills_score !== null && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Skills</div>
                              <div className="flex items-center gap-1 font-semibold">
                                <Award className="h-4 w-4 text-green-500" />
                                {application.skills_score.toFixed(0)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {candidate.cv_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.storage
                                  .from("cvstorage")
                                  .createSignedUrl(candidate.cv_url!, 60);
                                
                                if (error) throw error;
                                window.open(data.signedUrl, '_blank');
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to load CV",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            View CV
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              // Search Card (for candidates from candidate search)
              return (
                <Card key={candidate.id} className="border-border/50 hover:shadow-lg transition-all flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col space-y-4">
                    {/* Header with avatar and remove bookmark */}
                    <div className="flex items-start justify-between">
                      <Avatar className="h-14 w-14">
                        <AvatarImage 
                          src={(candidate as any).profile_image_url} 
                          alt={`${candidate.name} ${candidate.family_name}`}
                          loading="lazy"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-lg">
                          {candidate.name?.[0]}{candidate.family_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBookmark(candidate.id, candidate.bookmarked_by)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Bookmark className="h-5 w-5 fill-current" />
                      </Button>
                    </div>

                    {/* Essential Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl mb-2">
                        {candidate.name} {candidate.family_name}
                      </h3>
                      
                      {/* Location & Experience */}
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{candidate.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-4 w-4 flex-shrink-0" />
                          <span>{calculateExperience(workExperience)}</span>
                        </div>
                      </div>

                      {/* Education */}
                      {candidate.education && (candidate.education as any[]).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Education
                          </h4>
                          <div className="space-y-2">
                            {(candidate.education as any[]).slice(0, 2).map((edu: any, i: number) => (
                              <div key={i} className="text-sm">
                                <p className="font-medium">{edu.degree || edu.field}</p>
                                <p className="text-muted-foreground text-xs">{edu.institution}</p>
                                {(edu.start_year || edu.end_year || edu.year) && (
                                  <p className="text-muted-foreground text-xs">
                                    {edu.year || `${edu.start_year || ''} - ${edu.end_year || ''}`}
                                  </p>
                                )}
                              </div>
                            ))}
                            {(candidate.education as any[]).length > 2 && (
                              <p className="text-xs text-muted-foreground">+ {(candidate.education as any[]).length - 2} more</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Preferred Job Types */}
                      {candidate.preferred_job_types && candidate.preferred_job_types.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {candidate.preferred_job_types.slice(0, 3).map((type, i) => (
                            <Badge key={i} variant="outline" className="bg-accent/10 text-accent border-accent/20 text-xs">
                              {type}
                            </Badge>
                          ))}
                          {candidate.preferred_job_types.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.preferred_job_types.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 mt-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <User className="mr-1 h-4 w-4" />
                        Profile
                      </Button>
                      {candidate.cv_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from("cvstorage")
                                .createSignedUrl(candidate.cv_url!, 60);
                              
                              if (error) throw error;
                              window.open(data.signedUrl, '_blank');
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to load CV",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View CV
                        </Button>
                      )}
                      <Button 
                        variant="hero" 
                        size="sm"
                        onClick={() => {
                          setInviteCandidate(candidate);
                          setInviteStep(1);
                          setSelectedJob("");
                          setInviteMessage("");
                        }}
                      >
                        <Mail className="mr-1 h-4 w-4" />
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Candidate Profile Modal */}
        <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={(selectedCandidate as any)?.profile_image_url} 
                      alt={`${selectedCandidate?.name} ${selectedCandidate?.family_name}`}
                      loading="lazy"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl">
                      {selectedCandidate?.name?.[0]}{selectedCandidate?.family_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl">
                      {selectedCandidate?.name} {selectedCandidate?.family_name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedCandidate?.preferred_job_types?.[0] || "Job seeker"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => selectedCandidate && removeBookmark(selectedCandidate.id, selectedCandidate.bookmarked_by)}
                  className="h-10 w-10 text-destructive hover:text-destructive"
                >
                  <Bookmark className="h-6 w-6 fill-current" />
                </Button>
              </div>
            </DialogHeader>
            
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCandidate?.email}</span>
                    </div>
                    {selectedCandidate?.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCandidate.phone_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedCandidate?.location || "Location not specified"}
                        {selectedCandidate?.country ? `, ${selectedCandidate.country}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preferred Job Types */}
                {selectedCandidate?.preferred_job_types && selectedCandidate.preferred_job_types.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Looking For</h3>
                    <div className="flex gap-2 flex-wrap">
                      {selectedCandidate.preferred_job_types.map((type, i) => (
                        <Badge key={i} variant="outline" className="bg-accent/10 text-accent border-accent/20">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {selectedCandidate?.education && (selectedCandidate.education as any[]).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </h3>
                    <div className="space-y-3">
                      {(selectedCandidate.education as any[]).map((edu: any, i: number) => (
                        <div key={i} className="border-l-2 border-primary pl-4">
                          <p className="font-medium">{edu.degree || edu.field}</p>
                          <p className="text-muted-foreground">{edu.institution}</p>
                          {(edu.start_year || edu.end_year || edu.year) && (
                            <p className="text-sm text-muted-foreground">
                              {edu.year || `${edu.start_year || ''} - ${edu.end_year || ''}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {selectedCandidate?.work_experience && (selectedCandidate.work_experience as any[]).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Work Experience
                    </h3>
                    <div className="space-y-4">
                      {(selectedCandidate.work_experience as any[]).map((exp: any, i: number) => (
                        <div key={i} className="border-l-2 border-primary pl-4">
                          <p className="font-medium text-lg">{exp.position || exp.title}</p>
                          <p className="text-muted-foreground">{exp.company}</p>
                          {(exp.start_year || exp.start_date) && (
                            <p className="text-sm text-muted-foreground">
                              {exp.start_year ? 
                                `${exp.start_year} - ${exp.is_present ? "Present" : (exp.end_year || "")}` :
                                `${new Date(exp.start_date).toLocaleDateString()} - ${exp.end_date ? new Date(exp.end_date).toLocaleDateString() : "Present"}`
                              }
                            </p>
                          )}
                          {exp.description && (
                            <p className="text-sm mt-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificates */}
                {selectedCandidate?.certificates && (selectedCandidate.certificates as any[]).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certificates
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {(selectedCandidate.certificates as any[]).map((cert: any, i: number) => (
                        <Badge key={i} variant="secondary">
                          {cert.name || cert.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {selectedCandidate?.projects && (selectedCandidate.projects as any[]).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Projects
                    </h3>
                    <div className="space-y-3">
                      {(selectedCandidate.projects as any[]).map((proj: any, i: number) => (
                        <div key={i} className="border-l-2 border-primary pl-4">
                          <p className="font-medium">{proj.name || proj.title}</p>
                          {proj.description && (
                            <p className="text-sm text-muted-foreground mt-1">{proj.description}</p>
                          )}
                          {(proj.start_year || proj.end_year) && (
                            <p className="text-sm text-muted-foreground">
                              {proj.start_year} - {proj.end_year}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {selectedCandidate?.interests && (selectedCandidate.interests as string[]).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Interests
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {(selectedCandidate.interests as string[]).map((interest, i) => (
                        <Badge key={i} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                {(selectedCandidate?.github_url || selectedCandidate?.linkedin_url || selectedCandidate?.huggingface_url) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Links
                    </h3>
                    <div className="space-y-2">
                      {selectedCandidate.github_url && (
                        <a
                          href={selectedCandidate.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        >
                          <Github className="h-4 w-4" />
                          <span>GitHub</span>
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      )}
                      {selectedCandidate.linkedin_url && (
                        <a
                          href={selectedCandidate.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        >
                          <Linkedin className="h-4 w-4" />
                          <span>LinkedIn</span>
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      )}
                      {selectedCandidate.huggingface_url && (
                        <a
                          href={selectedCandidate.huggingface_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                        >
                          <LinkIcon className="h-4 w-4" />
                          <span>Hugging Face</span>
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* CV View */}
                {selectedCandidate?.cv_url && (
                  <div>
                    <Button 
                      variant="hero" 
                      className="w-full" 
                      size="lg"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.storage
                            .from("cvstorage")
                            .createSignedUrl(selectedCandidate.cv_url!, 60);
                          
                          if (error) throw error;
                          window.open(data.signedUrl, '_blank');
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to load CV",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Eye className="mr-2 h-5 w-5" />
                      View CV
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Invite to Apply Dialog */}
        <Dialog open={!!inviteCandidate} onOpenChange={() => {
          setInviteCandidate(null);
          setInviteStep(1);
          setSelectedJob("");
          setInviteMessage("");
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Invite {inviteCandidate?.name} {inviteCandidate?.family_name} to Apply
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${inviteStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  1
                </div>
                <div className={`h-px w-16 ${inviteStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${inviteStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  2
                </div>
              </div>

              {/* Step 1: Select Job */}
              {inviteStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Step 1: Select Job Position</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose which position you'd like to invite the candidate to apply for</p>
                  </div>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job position" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {jobPostings.length === 0 ? (
                        <SelectItem value="none" disabled>No open job postings available</SelectItem>
                      ) : (
                        jobPostings.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.job_title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setInviteCandidate(null)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="hero" 
                      onClick={() => setInviteStep(2)}
                      disabled={!selectedJob}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Personalize Message */}
              {inviteStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Step 2: Personalize Your Message</h3>
                    <p className="text-sm text-muted-foreground mb-4">Add a personal message to make your invitation stand out</p>
                  </div>
                  <Textarea
                    placeholder="Write a personalized message to the candidate..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={6}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setInviteStep(1)}>
                      Back
                    </Button>
                    <Button 
                      variant="hero"
                      onClick={() => {
                        toast({
                          title: "Invitation Sent",
                          description: `Successfully invited ${inviteCandidate?.name} to apply for the position.`,
                        });
                        setInviteCandidate(null);
                        setInviteStep(1);
                        setSelectedJob("");
                        setInviteMessage("");
                      }}
                    >
                      Send Invitation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RecruiterLayout>
  );
};

export default BookmarkedCandidates;