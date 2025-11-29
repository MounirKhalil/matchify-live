import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Target,
  Search,
  Plus,
  X,
  Loader2,
  TrendingUp,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  History,
  Globe,
  Code,
  Users,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JOB_CATEGORIES } from "@/constants/jobCategories";
import { CategorySelector } from "@/components/CategorySelector";
import { HeadHuntSettings } from "@/components/HeadHuntSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ExternalSearchCriteria {
  search_name: string;
  job_title: string;
  required_skills: string[];
  preferred_skills: string[];
  min_years_experience?: number;
  max_years_experience?: number;
  required_education_level?: string;
  preferred_education_fields: string[];
  target_locations: string[];
  target_countries: string[];
  categories: string[];
  required_certifications: string[];
  keywords: string[];
  exclude_keywords: string[];

  // Search sources
  search_linkedin: boolean;
  search_github: boolean;
  search_google: boolean;
  search_stackoverflow: boolean;
  search_twitter: boolean;

  detailed_requirements: string;
  company_size_preference?: string;
  industry_preferences: string[];
  min_match_score: number;
  max_results: number;
}

interface ExternalCandidate {
  source: string;
  source_url: string;
  full_name: string;
  headline?: string;
  location?: string;
  email?: string;
  current_company?: string;
  current_position?: string;
  linkedin_url?: string;
  github_url?: string;
  profile_image_url?: string;
  skills: string[];
  bio?: string;
  match_score: number;
}

interface SavedSearch {
  id: string;
  search_name: string;
  job_title: string;
  search_status: string;
  total_found: number;
  created_at: string;
  completed_at: string | null;
  results: ExternalCandidate[];
}

const EDUCATION_LEVELS = ["High School", "Associate's", "Bachelor's", "Master's", "PhD/Doctorate"];
const COMPANY_SIZES = ["Startup", "Mid-Size", "Enterprise", "Any"];

const HeadHunting = () => {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ExternalCandidate[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new-search");

  const [searchCriteria, setSearchCriteria] = useState<ExternalSearchCriteria>({
    search_name: "",
    job_title: "",
    required_skills: [],
    preferred_skills: [],
    min_years_experience: undefined,
    max_years_experience: undefined,
    required_education_level: undefined,
    preferred_education_fields: [],
    target_locations: [],
    target_countries: [],
    categories: [],
    required_certifications: [],
    keywords: [],
    exclude_keywords: [],
    search_linkedin: true,
    search_github: true,
    search_google: true,
    search_stackoverflow: false,
    search_twitter: false,
    detailed_requirements: "",
    company_size_preference: undefined,
    industry_preferences: [],
    min_match_score: 70,
    max_results: 50,
  });

  // Input states
  const [requiredSkillInput, setRequiredSkillInput] = useState("");
  const [preferredSkillInput, setPreferredSkillInput] = useState("");
  const [educationFieldInput, setEducationFieldInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [excludeKeywordInput, setExcludeKeywordInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const { data: recruiterProfile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .single();

      if (!recruiterProfile) return;

      const { data, error } = await supabase
        .from("headhunt_searches")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedSearches((data || []).map(search => ({
        ...search,
        results: (search.results as unknown as ExternalCandidate[]) || []
      })));
    } catch (error) {
      console.error("Error fetching saved searches:", error);
    }
  };

  const handleArrayAdd = (
    value: string,
    field: keyof ExternalSearchCriteria,
    setter: (value: string) => void
  ) => {
    if (!value.trim()) return;
    const currentArray = searchCriteria[field] as string[];
    if (!currentArray.includes(value.trim())) {
      setSearchCriteria({
        ...searchCriteria,
        [field]: [...currentArray, value.trim()],
      });
    }
    setter("");
  };

  const handleArrayRemove = (index: number, field: keyof ExternalSearchCriteria) => {
    const currentArray = searchCriteria[field] as string[];
    setSearchCriteria({
      ...searchCriteria,
      [field]: currentArray.filter((_, i) => i !== index),
    });
  };

  const handleSearch = async () => {
    if (!searchCriteria.search_name.trim() || !searchCriteria.job_title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a search name and job title",
        variant: "destructive",
      });
      return;
    }

    if (!searchCriteria.search_linkedin && !searchCriteria.search_github && !searchCriteria.search_google) {
      toast({
        title: "No Sources Selected",
        description: "Please select at least one search source",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data: recruiterProfile, error: recruiterError } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .single();

      if (recruiterError) throw recruiterError;

      const { data: searchRecord, error: createError } = await supabase
        .from("headhunt_searches")
        .insert({
          recruiter_id: recruiterProfile.id,
          ...searchCriteria,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "Search Started",
        description: "Scraping external sources for candidates...",
      });

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://mwqjyukczekhnimillfn.supabase.co/functions/v1/headhunt-external`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            search_id: searchRecord.id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Search failed");
      }

      setSearchResults(result.results || []);
      setActiveTab("results");

      toast({
        title: "Search Complete",
        description: `Found ${result.results.length} candidates from external sources`,
      });

      await fetchSavedSearches();
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to perform external search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const loadSavedSearch = async (searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId);
    if (!search) return;

    setSelectedSearch(searchId);
    setSearchResults(search.results || []);
    setActiveTab("results");
  };

  const deleteSavedSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from("headhunt_searches")
        .delete()
        .eq("id", searchId);

      if (error) throw error;

      toast({
        title: "Search Deleted",
        description: "Saved search has been removed",
      });

      await fetchSavedSearches();
      if (selectedSearch === searchId) {
        setSelectedSearch(null);
        setSearchResults([]);
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete saved search",
        variant: "destructive",
      });
    }
  };

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border/50 p-8 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary shadow-glow">
                <Target className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-4xl font-bold tracking-tight">External Head Hunting</h2>
                <p className="text-muted-foreground text-lg mt-1">AI-powered candidate discovery across multiple platforms</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl -z-0" />
        </div>

        <Alert className="border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-transparent">
          <Globe className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900">Search External Sources</AlertTitle>
          <AlertDescription className="text-blue-800">
            This feature scrapes public profiles from LinkedIn, GitHub, Google, and other platforms based on your criteria.
            Configure API keys in settings for best results.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14 p-1.5 bg-secondary/30 backdrop-blur-sm shadow-sm">
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </TabsTrigger>
            <TabsTrigger 
              value="new-search"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Search className="h-4 w-4 mr-2" />
              New Search
            </TabsTrigger>
            <TabsTrigger 
              value="saved-searches"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <History className="h-4 w-4 mr-2" />
              History ({savedSearches.length})
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Users className="h-4 w-4 mr-2" />
              Results ({searchResults.length})
            </TabsTrigger>
          </TabsList>

          {/* SETTINGS TAB */}
          <TabsContent value="settings">
            <HeadHuntSettings />
          </TabsContent>

          {/* NEW SEARCH TAB */}
          <TabsContent value="new-search" className="space-y-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Define Search Criteria</CardTitle>
                    <CardDescription>
                      Specify skills and requirements to search external talent sources
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="search_name" className="text-sm font-medium">Search Name *</Label>
                      <Input
                        id="search_name"
                        placeholder="e.g., Senior React Developers Q1 2025"
                        value={searchCriteria.search_name}
                        onChange={(e) =>
                          setSearchCriteria({ ...searchCriteria, search_name: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job_title" className="text-sm font-medium">Job Title / Role *</Label>
                      <Input
                        id="job_title"
                        placeholder="e.g., Senior Frontend Developer"
                        value={searchCriteria.job_title}
                        onChange={(e) =>
                          setSearchCriteria({ ...searchCriteria, job_title: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>

                  <Alert className="bg-muted/50 border-muted">
                    <Globe className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Configure search sources and API keys in the <strong>Settings</strong> tab
                    </AlertDescription>
                  </Alert>
                </div>

                <Separator className="my-6" />

                {/* Skills */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Skills & Technologies</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Required Skills (Must Have)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., React, TypeScript, Node.js"
                        value={requiredSkillInput}
                        onChange={(e) => setRequiredSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(requiredSkillInput, "required_skills", setRequiredSkillInput);
                          }
                        }}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          handleArrayAdd(requiredSkillInput, "required_skills", setRequiredSkillInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.required_skills.map((skill, index) => (
                        <Badge key={index} variant="default">
                          {skill}
                          <button
                            onClick={() => handleArrayRemove(index, "required_skills")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Skills (Nice to Have)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., AWS, Docker, GraphQL"
                        value={preferredSkillInput}
                        onChange={(e) => setPreferredSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(preferredSkillInput, "preferred_skills", setPreferredSkillInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          handleArrayAdd(preferredSkillInput, "preferred_skills", setPreferredSkillInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.preferred_skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                          <button
                            onClick={() => handleArrayRemove(index, "preferred_skills")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Location & Categories */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Location & Categories</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Target Locations (Cities)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., San Francisco, London, Remote"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(locationInput, "target_locations", setLocationInput);
                          }
                        }}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleArrayAdd(locationInput, "target_locations", setLocationInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.target_locations.map((loc, index) => (
                        <Badge key={index} variant="default">
                          {loc}
                          <button
                            onClick={() => handleArrayRemove(index, "target_locations")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Target Countries</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., United States, United Kingdom"
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(countryInput, "target_countries", setCountryInput);
                          }
                        }}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleArrayAdd(countryInput, "target_countries", setCountryInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.target_countries.map((country, index) => (
                        <Badge key={index} variant="secondary">
                          {country}
                          <button
                            onClick={() => handleArrayRemove(index, "target_countries")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Categories */}
                <div className="space-y-2">
                  <CategorySelector
                    label="Job Categories"
                    selectedCategories={searchCriteria.categories}
                    onCategoryToggle={(category) => {
                      const newCategories = searchCriteria.categories.includes(category)
                        ? searchCriteria.categories.filter(c => c !== category)
                        : [...searchCriteria.categories, category];
                      setSearchCriteria({ ...searchCriteria, categories: newCategories });
                    }}
                  />
                </div>

                <Separator />

                {/* Certifications */}
                <div className="space-y-2">
                  <Label>Required Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., AWS Certified, PMP"
                      value={certificationInput}
                      onChange={(e) => setCertificationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleArrayAdd(certificationInput, "required_certifications", setCertificationInput);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        handleArrayAdd(certificationInput, "required_certifications", setCertificationInput)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {searchCriteria.required_certifications.map((cert, index) => (
                      <Badge key={index} variant="default">
                        {cert}
                        <button
                          onClick={() => handleArrayRemove(index, "required_certifications")}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Keywords */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Keywords</h3>

                  <div className="space-y-2">
                    <Label>Must Include Keywords</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., startup, leadership, open source"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(keywordInput, "keywords", setKeywordInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => handleArrayAdd(keywordInput, "keywords", setKeywordInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.keywords.map((kw, index) => (
                        <Badge key={index} variant="default">
                          {kw}
                          <button
                            onClick={() => handleArrayRemove(index, "keywords")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Exclude Keywords</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., freelance, contract"
                        value={excludeKeywordInput}
                        onChange={(e) => setExcludeKeywordInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleArrayAdd(excludeKeywordInput, "exclude_keywords", setExcludeKeywordInput);
                          }
                        }}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          handleArrayAdd(excludeKeywordInput, "exclude_keywords", setExcludeKeywordInput)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {searchCriteria.exclude_keywords.map((kw, index) => (
                        <Badge key={index} variant="destructive">
                          {kw}
                          <button
                            onClick={() => handleArrayRemove(index, "exclude_keywords")}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Search Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Search Settings</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_score" className="text-sm font-medium">Minimum Match Score (%)</Label>
                      <Input
                        id="min_score"
                        type="number"
                        min="0"
                        max="100"
                        value={searchCriteria.min_match_score}
                        onChange={(e) =>
                          setSearchCriteria({
                            ...searchCriteria,
                            min_match_score: parseInt(e.target.value) || 70,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_results" className="text-sm font-medium">Maximum Results</Label>
                      <Input
                        id="max_results"
                        type="number"
                        min="1"
                        max="200"
                        value={searchCriteria.max_results}
                        onChange={(e) =>
                          setSearchCriteria({
                            ...searchCriteria,
                            max_results: parseInt(e.target.value) || 50,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full"
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching External Sources...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Search for Candidates
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAVED SEARCHES TAB */}
          <TabsContent value="saved-searches">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Your Saved Searches</CardTitle>
                <CardDescription>
                  View and manage your previous headhunt searches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedSearches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved searches yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedSearches.map((search) => (
                      <Card key={search.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{search.search_name}</h3>
                            <p className="text-sm text-muted-foreground">{search.job_title}</p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Created: {new Date(search.created_at).toLocaleDateString()}</span>
                              <span>Status: <Badge variant={search.search_status === 'completed' ? 'default' : 'secondary'}>{search.search_status}</Badge></span>
                              <span>Found: {search.total_found} candidates</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => loadSavedSearch(search.id)}
                              disabled={search.search_status !== 'completed'}
                            >
                              View Results
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteSavedSearch(search.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RESULTS TAB */}
          <TabsContent value="results">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} external candidates found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results yet. Create a search to find candidates from external sources.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((candidate, idx) => (
                      <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage 
                              src={candidate.profile_image_url || undefined}
                              loading="lazy"
                            />
                            <AvatarFallback>
                              {candidate.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-semibold">{candidate.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{candidate.headline}</p>
                                {candidate.location && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {candidate.location}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                  {candidate.match_score}%
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  {candidate.source}
                                </Badge>
                              </div>
                            </div>

                            <Progress value={candidate.match_score} className="h-2 mb-3" />

                            {candidate.skills && candidate.skills.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium mb-2">Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {candidate.skills.slice(0, 10).map((skill, sidx) => (
                                    <Badge key={sidx} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {candidate.skills.length > 10 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{candidate.skills.length - 10} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {candidate.bio && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {candidate.bio}
                              </p>
                            )}

                            <div className="flex gap-2">
                              {candidate.email && (
                                <Button size="sm" asChild>
                                  <a href={`mailto:${candidate.email}`}>
                                    <Mail className="h-4 w-4 mr-1" />
                                    Contact
                                  </a>
                                </Button>
                              )}
                              {candidate.linkedin_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                                    <Linkedin className="h-4 w-4 mr-1" />
                                    LinkedIn
                                  </a>
                                </Button>
                              )}
                              {candidate.github_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer">
                                    <Github className="h-4 w-4 mr-1" />
                                    GitHub
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" variant="outline" asChild>
                                <a href={candidate.source_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Profile
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RecruiterLayout>
  );
};

export default HeadHunting;
