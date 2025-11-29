import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  MapPin,
  Briefcase,
  Bookmark,
  X,
  User,
  Mail,
  Phone,
  Globe,
  GraduationCap,
  Award,
  FolderOpen,
  Heart,
  Github,
  Linkedin,
  Link as LinkIcon,
  ExternalLink,
  Eye,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CandidateProfile = Tables<"candidate_profiles">;

const CandidateSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [filters, setFilters] = useState({
    experience: "any",
    location: "any",
    availability: "any",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRecruiterId();
    fetchCandidates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, candidates]);

  const fetchRecruiterId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setRecruiterId(profile.id);
      }
    }
  };

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...candidates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.family_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.location?.toLowerCase().includes(query) ||
          c.preferred_job_types?.some((type) => type.toLowerCase().includes(query))
      );
    }

    // Location filter
    if (filters.location !== "any") {
      filtered = filtered.filter((c) => c.location?.toLowerCase().includes(filters.location));
    }

    // Experience filter
    if (filters.experience !== "any") {
      filtered = filtered.filter((c) => {
        const experience = c.work_experience as any[];
        if (!experience || experience.length === 0) return false;
        
        const totalYears = experience.reduce((sum, exp) => {
          const start = new Date(exp.start_date);
          const end = exp.end_date ? new Date(exp.end_date) : new Date();
          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return sum + years;
        }, 0);

        if (filters.experience === "entry") return totalYears < 3;
        if (filters.experience === "mid") return totalYears >= 3 && totalYears < 6;
        if (filters.experience === "senior") return totalYears >= 6;
        return true;
      });
    }

    setFilteredCandidates(filtered);
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

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, bookmarked_by: newBookmarks } : c
        )
      );

      toast({
        title: isBookmarked ? "Bookmark removed" : "Candidate bookmarked",
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

  const clearFilters = () => {
    setFilters({
      experience: "any",
      location: "any",
      availability: "any",
    });
    setSearchQuery("");
  };

  const hasActiveFilters = filters.experience !== "any" || filters.location !== "any" || filters.availability !== "any" || searchQuery;

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

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Candidate Search</h2>
          <p className="text-muted-foreground">Find the perfect candidates for your open positions</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, skills, location, or keywords..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Experience Level</Label>
                <Select value={filters.experience} onValueChange={(val) => setFilters({ ...filters, experience: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (6+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Location</Label>
                <Select value={filters.location} onValueChange={(val) => setFilters({ ...filters, location: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="san francisco">San Francisco</SelectItem>
                    <SelectItem value="new york">New York</SelectItem>
                    <SelectItem value="austin">Austin</SelectItem>
                    <SelectItem value="london">London</SelectItem>
                    <SelectItem value="berlin">Berlin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px] space-y-2">
                <Label>Availability</Label>
                <Select value={filters.availability} onValueChange={(val) => setFilters({ ...filters, availability: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="2weeks">Within 2 weeks</SelectItem>
                    <SelectItem value="1month">Within 1 month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="h-10">
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Showing {filteredCandidates.length} {filteredCandidates.length === 1 ? "candidate" : "candidates"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No candidates found matching your criteria</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCandidates.map((candidate) => {
                  const isBookmarked = candidate.bookmarked_by?.includes(recruiterId || "");
                  const workExperience = candidate.work_experience as any[];
                  
                  return (
                    <Card key={candidate.id} className="border-border/50 hover:shadow-lg transition-all flex flex-col">
                      <CardContent className="p-6 flex-1 flex flex-col space-y-4">
                        {/* Header with avatar and bookmark */}
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
                            onClick={() => toggleBookmark(candidate.id, candidate.bookmarked_by)}
                            className="h-8 w-8"
                          >
                            <Bookmark
                              className={`h-5 w-5 ${isBookmarked ? "fill-primary text-primary" : ""}`}
                            />
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
                        <div className="grid grid-cols-2 gap-2 mt-auto">
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
                  onClick={() => selectedCandidate && toggleBookmark(selectedCandidate.id, selectedCandidate.bookmarked_by)}
                  className="h-10 w-10"
                >
                  <Bookmark
                    className={`h-6 w-6 ${selectedCandidate?.bookmarked_by?.includes(recruiterId || "") ? "fill-primary text-primary" : ""}`}
                  />
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
      </div>
    </RecruiterLayout>
  );
};

export default CandidateSearch;
