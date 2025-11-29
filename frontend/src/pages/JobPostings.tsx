import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Search, X, Upload, FileText, Calendar, Filter, Edit, Trash2, Eye, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CategorySelector } from "@/components/CategorySelector";
import { CategoryFilterCombobox } from "@/components/CategoryFilterCombobox";

type Requirement = {
  text: string;
  priority: "must_have" | "nice_to_have" | "preferable";
};

type JobPosting = {
  id: string;
  job_title: string;
  requirements: Requirement[];
  description_url: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  public_information: string | null;
  public_job_description_file: boolean;
  categories: string[];
};

const JobPostings = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([{ text: "", priority: "must_have" }]);
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [publicInformation, setPublicInformation] = useState("");
  const [publicJobDescriptionFile, setPublicJobDescriptionFile] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: recruiterProfile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!recruiterProfile) return;

      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .eq("recruiter_id", recruiterProfile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map the data to properly type the requirements
      const typedData = (data || []).map(post => ({
        ...post,
        requirements: post.requirements as unknown as Requirement[]
      }));
      
      setJobPostings(typedData);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      toast({
        title: "Error",
        description: "Failed to load job postings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = () => {
    setRequirements([...requirements, { text: "", priority: "must_have" }]);
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleRequirementChange = (index: number, field: "text" | "priority", value: string) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const handleEdit = (posting: JobPosting) => {
    setEditingId(posting.id);
    setJobTitle(posting.job_title);
    
    // Handle both old format {requirement: "text"} and new format {text: "...", priority: "..."}
    const normalizedRequirements = posting.requirements.length > 0 
      ? posting.requirements.map(req => {
          const reqText = (req as any).text || (req as any).requirement || "";
          const reqPriority = req.priority || "must_have";
          return { text: reqText, priority: reqPriority };
        })
      : [{ text: "", priority: "must_have" as const }];
    
    setRequirements(normalizedRequirements);
    setStatus(posting.status);
    setPublicInformation(posting.public_information || "");
    setPublicJobDescriptionFile(posting.public_job_description_file);
    setSelectedCategories(posting.categories || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string, descriptionUrl: string | null) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    try {
      // Delete PDF from storage if exists
      if (descriptionUrl) {
        const { error: storageError } = await supabase.storage
          .from("jobpostings")
          .remove([descriptionUrl]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }

      // Delete job posting from database
      const { error } = await supabase
        .from("job_postings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job posting deleted successfully",
      });
      fetchJobPostings();
    } catch (error) {
      console.error("Error deleting job posting:", error);
      toast({
        title: "Error",
        description: "Failed to delete job posting",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setJobTitle("");
    setRequirements([{ text: "", priority: "must_have" }]);
    setStatus("open");
    setPdfFile(null);
    setPublicInformation("");
    setPublicJobDescriptionFile(false);
    setSelectedCategories([]);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: recruiterProfile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!recruiterProfile) throw new Error("Recruiter profile not found");

      let descriptionUrl = null;
      
      // If editing and there's a new file, delete the old one first
      if (editingId && pdfFile) {
        const oldPosting = jobPostings.find(p => p.id === editingId);
        if (oldPosting?.description_url) {
          const { error: deleteError } = await supabase.storage
            .from("jobpostings")
            .remove([oldPosting.description_url]);
          
          if (deleteError) {
            console.error("Error deleting old file:", deleteError);
          }
        }
      }

      // Upload new PDF if provided
      if (pdfFile) {
        const fileName = `${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from("jobpostings")
          .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;
        descriptionUrl = fileName;
      } else if (editingId) {
        // Keep existing URL if editing and no new file
        const oldPosting = jobPostings.find(p => p.id === editingId);
        descriptionUrl = oldPosting?.description_url || null;
      }

      // Filter out empty requirements
      const validRequirements = requirements.filter(req => req.text.trim() !== "");

      const jobData = {
        job_title: jobTitle,
        requirements: validRequirements,
        description_url: descriptionUrl,
        status: status,
        public_information: publicInformation || null,
        public_job_description_file: publicJobDescriptionFile,
        categories: selectedCategories,
        recruiter_id: recruiterProfile.id,
      };

      if (editingId) {
        // Update existing posting
        const { error } = await supabase
          .from("job_postings")
          .update(jobData)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Job posting updated successfully",
        });
      } else {
        // Create new posting
        const { error } = await supabase
          .from("job_postings")
          .insert(jobData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Job posting created successfully",
        });
      }

      resetForm();
      fetchJobPostings();
    } catch (error) {
      console.error("Error saving job posting:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingId ? "update" : "create"} job posting`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPostings = jobPostings.filter(posting => {
    const matchesSearch = posting.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || posting.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || (posting.categories || []).includes(categoryFilter);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "must_have": return "Must Have";
      case "nice_to_have": return "Nice to Have";
      case "preferable": return "Preferable";
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "must_have": return "bg-destructive/10 text-destructive border-destructive/20";
      case "nice_to_have": return "bg-accent/10 text-accent border-accent/20";
      case "preferable": return "bg-secondary/10 text-secondary border-secondary/20";
      default: return "";
    }
  };

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Job Postings</h2>
              <p className="text-muted-foreground">Create and manage your job openings</p>
            </div>
          </div>
          <Button variant="hero" size="lg" onClick={() => setShowForm(true)} className="shadow-glow">
            <Plus className="mr-2 h-5 w-5" />
            Create Job Posting
          </Button>
        </div>

        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Job Posting" : "Create New Job Posting"}</DialogTitle>
              <DialogDescription>Fill in the details for your job opening</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Frontend Developer"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Requirements *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddRequirement}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                  {requirements.map((req, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={req.text}
                        onChange={(e) => handleRequirementChange(index, "text", e.target.value)}
                        placeholder="Enter requirement"
                        className="flex-1"
                        rows={2}
                      />
                      <Select
                        value={req.priority}
                        onValueChange={(value) => handleRequirementChange(index, "priority", value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="must_have">Must Have</SelectItem>
                          <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                          <SelectItem value="preferable">Preferable</SelectItem>
                        </SelectContent>
                      </Select>
                      {requirements.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveRequirement(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <CategorySelector
                  selectedCategories={selectedCategories}
                  onCategoryToggle={handleCategoryToggle}
                  label="Job Categories"
                  description="Select all categories that apply to this position"
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="publicInformation">Public Information</Label>
                  <Textarea
                    id="publicInformation"
                    value={publicInformation}
                    onChange={(e) => setPublicInformation(e.target.value)}
                    placeholder="Enter detailed job description..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Job Description (PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="description"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {pdfFile && (
                      <Badge variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        {pdfFile.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="publicJobDescriptionFile">Public Job Description File</Label>
                    <p className="text-sm text-muted-foreground">Make the job description PDF publicly accessible</p>
                  </div>
                  <Switch
                    id="publicJobDescriptionFile"
                    checked={publicJobDescriptionFile}
                    onCheckedChange={setPublicJobDescriptionFile}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={status} onValueChange={(value: "open" | "closed") => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex gap-2">
                <Button type="submit" variant="hero" disabled={submitting}>
                  {submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Job Posting" : "Create Job Posting")}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search job postings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <CategoryFilterCombobox
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Postings Grid */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading job postings...
            </CardContent>
          </Card>
        ) : filteredPostings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No job postings found. Create your first one!
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPostings.map((posting) => (
              <Card key={posting.id} className="hover:shadow-lg transition-all flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold flex-1">{posting.job_title}</h3>
                      <Badge variant={posting.status === "open" ? "default" : "secondary"} className="ml-2">
                        {posting.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>Posted {new Date(posting.created_at).toLocaleDateString()}</span>
                    </div>
                    {/* Categories */}
                    {posting.categories && posting.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {posting.categories.slice(0, 3).map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {category}
                          </Badge>
                        ))}
                        {posting.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{posting.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Public Information */}
                  {posting.public_information && (
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-2">Description:</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">{posting.public_information}</p>
                    </div>
                  )}

                  {/* Requirements */}
                  {posting.requirements.length > 0 && (
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-2">Requirements:</h4>
                      <div className="space-y-2">
                        {posting.requirements.slice(0, 3).map((req, idx) => {
                          // Handle both old format {requirement: "text"} and new format {text: "...", priority: "..."}
                          const reqText = (req as any).text || (req as any).requirement;
                          const reqPriority = req.priority || "must_have";
                          
                          return (
                            <div key={idx} className="space-y-1">
                              <Badge variant="outline" className={`${getPriorityColor(reqPriority)} text-xs`}>
                                {getPriorityLabel(reqPriority)}
                              </Badge>
                              <p className="text-sm text-muted-foreground line-clamp-2">{reqText}</p>
                            </div>
                          );
                        })}
                        {posting.requirements.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{posting.requirements.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description PDF */}
                  {posting.description_url && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-2 text-xs">
                            <FileText className="h-3 w-3" />
                            PDF Description
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.storage
                                  .from("jobpostings")
                                  .createSignedUrl(posting.description_url!, 60);
                                
                                if (error) throw error;
                                window.open(data.signedUrl, '_blank');
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to load PDF",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant={posting.public_job_description_file ? "default" : "secondary"} className="text-xs">
                          {posting.public_job_description_file ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(posting)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(posting.id, posting.description_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
};

export default JobPostings;