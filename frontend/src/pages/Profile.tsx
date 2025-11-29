import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  Plus,
  Save,
  Upload,
  User,
  X,
  Loader2,
  Download,
  Trash2,
  Eye,
  Briefcase,
  Github,
  Linkedin,
  Link as LinkIcon,
  Sparkles,
  Tag,
  Camera,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { CategorySelector } from "@/components/CategorySelector";
import { ProfilePalAPIService } from "@/services/profile-pal-api.service";

interface Education {
  degree: string;
  institution: string;
  start_year: string;
  end_year: string;
  field: string;
  is_present: boolean;
}

interface WorkExperience {
  title: string;
  company: string;
  start_year: string;
  end_year: string;
  description: string;
  is_present: boolean;
}

interface Certificate {
  name: string;
  issuer: string;
  date: string;
}

interface Paper {
  title: string;
  publication: string;
  date: string;
  link: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string;
  link: string;
  start_year: string;
  end_year: string;
}

interface OtherSection {
  title: string;
  description: string;
}

interface ProfileData {
  name: string;
  family_name: string;
  email: string;
  phone_number: string;
  country: string;
  date_of_birth: string;
  location: string;
  cv_url: string;
  profile_image_url: string;
  interests: string[];
  automatic: boolean;
  refine: boolean;
  applications_sent: number;
  preferred_job_types: string[];
  preferred_categories: string[];
  education: Education[];
  work_experience: WorkExperience[];
  certificates: Certificate[];
  papers: Paper[];
  projects: Project[];
  other_sections: OtherSection[];
  github_url: string;
  huggingface_url: string;
  linkedin_url: string;
  autofill_from_cv: boolean;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    family_name: "",
    email: "",
    phone_number: "",
    country: "",
    date_of_birth: "",
    location: "",
    cv_url: "",
    profile_image_url: "",
    interests: [],
    automatic: false,
    refine: false,
    applications_sent: 0,
    preferred_job_types: [],
    preferred_categories: [],
    education: [],
    work_experience: [],
    certificates: [],
    papers: [],
    projects: [],
    other_sections: [],
    github_url: "",
    huggingface_url: "",
    linkedin_url: "",
    autofill_from_cv: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const { data, error } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            name: data.name || "",
            family_name: data.family_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            country: data.country || "",
            date_of_birth: data.date_of_birth || "",
            location: data.location || "",
            cv_url: data.cv_url || "",
            profile_image_url: (data as any).profile_image_url || "",
            interests: data.interests || [],
            automatic: data.automatic || false,
            refine: data.refine || false,
            applications_sent: data.applications_sent || 0,
            preferred_job_types: data.preferred_job_types || [],
            preferred_categories: data.preferred_categories || [],
            education: Array.isArray((data as any).education)
              ? (data as any).education.map((e: any) => ({
                  degree: e.degree || "",
                  institution: e.institution || "",
                  start_year: e.start_year || "",
                  end_year: (e.is_present ? "" : (e.end_year || "")),
                  field: e.field || "",
                  is_present: Boolean(e.is_present),
                }))
              : [],
            work_experience: Array.isArray((data as any).work_experience)
              ? (data as any).work_experience.map((w: any) => ({
                  title: w.title || "",
                  company: w.company || "",
                  start_year: w.start_year || "",
                  end_year: (w.is_present ? "" : (w.end_year || "")),
                  description: w.description || "",
                  is_present: Boolean(w.is_present),
                }))
              : [],
            certificates: (data.certificates as unknown as Certificate[]) || [],
            papers: (data.papers as unknown as Paper[]) || [],
            projects: (data.projects as unknown as Project[]) || [],
            other_sections: (data.other_sections as unknown as OtherSection[]) || [],
            github_url: data.github_url || "",
            huggingface_url: data.huggingface_url || "",
            linkedin_url: data.linkedin_url || "",
            autofill_from_cv: data.autofill_from_cv ?? true,
          });
        }
        break; // success
      } catch (error: any) {
        const isFetchError = typeof error?.message === "string" && error.message.includes("Failed to fetch");
        attempt++;
        if (!isFetchError || attempt >= maxRetries) {
          toast({
            title: "Error loading profile",
            description: error?.message || "Unexpected error",
            variant: "destructive",
          });
          break;
        }
        await new Promise((res) => setTimeout(res, attempt * 300));
      } finally {
        if (attempt >= maxRetries) setLoading(false);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First get candidate profile ID
      const { data: candidateData } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from("candidate_profiles")
        .update({
          name: profile.name,
          family_name: profile.family_name,
          email: profile.email,
          phone_number: profile.phone_number || null,
          country: profile.country || null,
          date_of_birth: profile.date_of_birth || null,
          location: profile.location || null,
          interests: profile.interests,
          automatic: profile.automatic,
          refine: profile.refine,
          preferred_job_types: profile.preferred_job_types,
          preferred_categories: profile.preferred_categories,
          education: profile.education as any,
          work_experience: profile.work_experience as any,
          certificates: profile.certificates as any,
          papers: profile.papers as any,
          projects: profile.projects as any,
          other_sections: profile.other_sections as any,
          github_url: profile.github_url || null,
          huggingface_url: profile.huggingface_url || null,
          linkedin_url: profile.linkedin_url || null,
          profile_image_url: profile.profile_image_url,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      // Generate embeddings for searchability in recruiter chatbot
      if (candidateData?.id) {
        try {
          await supabase.functions.invoke("generate-embeddings", {
            body: {
              candidate_id: candidateData.id,
              candidate_data: {
                name: profile.name,
                family_name: profile.family_name,
                location: profile.location,
                country: profile.country,
                interests: profile.interests,
                work_experience: profile.work_experience,
                education: profile.education,
                certificates: profile.certificates,
                projects: profile.projects,
                github_url: profile.github_url,
                linkedin_url: profile.linkedin_url,
              },
            },
          });
        } catch (embeddingError) {
          console.error("Error generating embeddings:", embeddingError);
          // Don't fail the save if embedding generation fails
        }
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved and is now searchable by recruiters.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = async (field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("candidate_profiles")
        .update({ [field]: value })
        .eq("user_id", user?.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Auto-save error:", error);
    }
  };

  const handlePreferredJobTypeToggle = async (type: string) => {
    const newTypes = profile.preferred_job_types.includes(type)
      ? profile.preferred_job_types.filter(t => t !== type)
      : [...profile.preferred_job_types, type];
    
    setProfile({ ...profile, preferred_job_types: newTypes });
    await handleAutoSave("preferred_job_types", newTypes);
  };

  const handlePreferredCategoryToggle = async (category: string) => {
    const newCategories = profile.preferred_categories.includes(category)
      ? profile.preferred_categories.filter(c => c !== category)
      : [...profile.preferred_categories, category];
    
    setProfile({ ...profile, preferred_categories: newCategories });
    await handleAutoSave("preferred_categories", newCategories);
  };

  const addEducation = () => {
    const newEducation = [...profile.education, { degree: "", institution: "", start_year: "", end_year: "", field: "", is_present: false }];
    setProfile({ ...profile, education: newEducation });
  };

  const removeEducation = async (index: number) => {
    const newEducation = profile.education.filter((_, i) => i !== index);
    setProfile({ ...profile, education: newEducation });
    await handleAutoSave("education", newEducation);
  };

  const updateEducation = async (index: number, field: string, value: any) => {
    const newEducation = [...profile.education];
    if (field === "is_present") {
      const isPresent = Boolean(value);
      newEducation[index] = { ...newEducation[index], is_present: isPresent, end_year: isPresent ? "" : newEducation[index].end_year };
    } else {
      newEducation[index] = { ...newEducation[index], [field]: value } as Education;
    }
    setProfile({ ...profile, education: newEducation });
    await handleAutoSave("education", newEducation);
  };

  const addWorkExperience = () => {
    const newWorkExperience = [...profile.work_experience, { title: "", company: "", start_year: "", end_year: "", description: "", is_present: false }];
    setProfile({ ...profile, work_experience: newWorkExperience });
  };

  const removeWorkExperience = async (index: number) => {
    const newWorkExperience = profile.work_experience.filter((_, i) => i !== index);
    setProfile({ ...profile, work_experience: newWorkExperience });
    await handleAutoSave("work_experience", newWorkExperience);
  };

  const updateWorkExperience = async (index: number, field: string, value: any) => {
    const newWorkExperience = [...profile.work_experience];
    if (field === "is_present") {
      const isPresent = Boolean(value);
      newWorkExperience[index] = { ...newWorkExperience[index], is_present: isPresent, end_year: isPresent ? "" : newWorkExperience[index].end_year };
    } else {
      newWorkExperience[index] = { ...newWorkExperience[index], [field]: value } as WorkExperience;
    }
    setProfile({ ...profile, work_experience: newWorkExperience });
    await handleAutoSave("work_experience", newWorkExperience);
  };

  const addCertificate = () => {
    const newCertificates = [...profile.certificates, { name: "", issuer: "", date: "" }];
    setProfile({ ...profile, certificates: newCertificates });
  };

  const removeCertificate = async (index: number) => {
    const newCertificates = profile.certificates.filter((_, i) => i !== index);
    setProfile({ ...profile, certificates: newCertificates });
    await handleAutoSave("certificates", newCertificates);
  };

  const updateCertificate = async (index: number, field: string, value: string) => {
    const newCertificates = [...profile.certificates];
    newCertificates[index] = { ...newCertificates[index], [field]: value };
    setProfile({ ...profile, certificates: newCertificates });
    await handleAutoSave("certificates", newCertificates);
  };

  const addPaper = () => {
    const newPapers = [...profile.papers, { title: "", publication: "", date: "", link: "" }];
    setProfile({ ...profile, papers: newPapers });
  };

  const removePaper = async (index: number) => {
    const newPapers = profile.papers.filter((_, i) => i !== index);
    setProfile({ ...profile, papers: newPapers });
    await handleAutoSave("papers", newPapers);
  };

  const updatePaper = async (index: number, field: string, value: string) => {
    const newPapers = [...profile.papers];
    newPapers[index] = { ...newPapers[index], [field]: value };
    setProfile({ ...profile, papers: newPapers });
    await handleAutoSave("papers", newPapers);
  };

  const addProject = () => {
    const newProjects = [...profile.projects, { name: "", description: "", technologies: "", link: "", start_year: "", end_year: "" }];
    setProfile({ ...profile, projects: newProjects });
  };

  const removeProject = async (index: number) => {
    const newProjects = profile.projects.filter((_, i) => i !== index);
    setProfile({ ...profile, projects: newProjects });
    await handleAutoSave("projects", newProjects);
  };

  const updateProject = async (index: number, field: string, value: string) => {
    const newProjects = [...profile.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setProfile({ ...profile, projects: newProjects });
    await handleAutoSave("projects", newProjects);
  };

  const addOtherSection = () => {
    const newOtherSections = [...profile.other_sections, { title: "", description: "" }];
    setProfile({ ...profile, other_sections: newOtherSections });
  };

  const removeOtherSection = async (index: number) => {
    const newOtherSections = profile.other_sections.filter((_, i) => i !== index);
    setProfile({ ...profile, other_sections: newOtherSections });
    await handleAutoSave("other_sections", newOtherSections);
  };

  const updateOtherSection = async (index: number, field: string, value: string) => {
    const newOtherSections = [...profile.other_sections];
    newOtherSections[index] = { ...newOtherSections[index], [field]: value };
    setProfile({ ...profile, other_sections: newOtherSections });
    await handleAutoSave("other_sections", newOtherSections);
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Delete old CV file if exists
      if (profile.cv_url) {
        // Extract filename from URL
        const urlParts = profile.cv_url.split('/cvstorage/');
        const fileName = urlParts[1];
        if (fileName) {
          await supabase.storage.from("cvstorage").remove([fileName]);
        }
      }

      // Upload new CV directly without folders
      const fileName = `${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("cvstorage")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("cvstorage")
        .getPublicUrl(fileName);

      // Update database with full public URL
      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ cv_url: publicUrl })
        .eq("user_id", user?.id);

      if (updateError) {
        await supabase.storage.from("cvstorage").remove([fileName]);
        throw updateError;
      }

      setProfile({ ...profile, cv_url: publicUrl });

      toast({
        title: "CV uploaded",
        description: "Your CV has been uploaded successfully.",
      });

      // Check if autofill is enabled and process CV
      if (profile.autofill_from_cv) {
        toast({
          title: "Processing CV",
          description: "Extracting information from your CV...",
        });

        try {
          const autofillResponse = await ProfilePalAPIService.processCVAutofill(fileName);

          if (autofillResponse.success && autofillResponse.updated_fields && autofillResponse.updated_fields.length > 0) {
            toast({
              title: "Profile auto-filled!",
              description: `Updated ${autofillResponse.updated_fields.length} fields from your CV. Refresh to see changes.`,
            });

            // Reload profile to show updated data
            setTimeout(() => {
              loadProfile();
            }, 1000);
          } else if (!autofillResponse.success) {
            toast({
              title: "Autofill skipped",
              description: autofillResponse.message || "Could not extract information from CV.",
            });
          }
        } catch (autofillError: any) {
          console.error('Autofill error:', autofillError);
          toast({
            title: "Autofill failed",
            description: "CV uploaded but autofill encountered an error. You can still fill your profile manually.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error uploading CV",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewCV = () => {
    if (!profile.cv_url) {
      toast({
        title: "No CV found",
        description: "Please upload a CV first.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Opening CV URL:', profile.cv_url);
    window.open(profile.cv_url, '_blank');
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()],
      });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter((i) => i !== interest),
    });
  };

  const handleDeleteCV = async () => {
    if (!profile.cv_url) return;

    try {
      // Extract filename from URL
      const urlParts = profile.cv_url.split('/cvstorage/');
      const fileName = urlParts[1];

      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from("cvstorage")
          .remove([fileName]);

        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ cv_url: null })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, cv_url: "" });

      toast({
        title: "CV deleted",
        description: "Your CV has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting CV",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Delete old profile image if exists
      if (profile.profile_image_url) {
        await supabase.storage.from("profile_images").remove([profile.profile_image_url]);
      }

      // Generate unique filename with user ID and timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("profile_images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile_images")
        .getPublicUrl(fileName);

      // Update database with new image URL
      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ profile_image_url: publicUrl } as any)
        .eq("user_id", user?.id);

      if (updateError) {
        await supabase.storage.from("profile_images").remove([fileName]);
        throw updateError;
      }

      setProfile({ ...profile, profile_image_url: publicUrl });

      toast({
        title: "Profile image uploaded",
        description: "Your profile image has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProfileImage = async () => {
    if (!profile.profile_image_url) return;

    try {
      // Extract path from URL
      const urlParts = profile.profile_image_url.split('/profile_images/');
      const filePath = urlParts[1];

      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from("profile_images")
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      const { error: updateError } = await supabase
        .from("candidate_profiles")
        .update({ profile_image_url: null } as any)
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image_url: "" });

      toast({
        title: "Profile image deleted",
        description: "Your profile image has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting image",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation userType="seeker" />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gradient">My Profile</h1>
            <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
              <Briefcase className="h-3 w-3 mr-1" />
              Job Seeker
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage your professional information and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Image Section */}
            <Card className="shadow-md border-secondary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/30">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  Profile Image
                </CardTitle>
                <CardDescription>Upload your profile picture (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={profile.profile_image_url} 
                      alt={`${profile.name} ${profile.family_name}`}
                      loading="lazy"
                    />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                      {profile.name?.[0]?.toUpperCase() || ''}{profile.family_name?.[0]?.toUpperCase() || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    {profile.profile_image_url && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteProfileImage}
                        disabled={uploading}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Image
                      </Button>
                    )}
                    <div>
                      <label htmlFor="profile-image-upload">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          asChild
                        >
                          <span className="cursor-pointer">
                            {uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Camera className="mr-2 h-4 w-4" />
                                {profile.profile_image_url ? 'Change Image' : 'Upload Image'}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP • Max 5MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CV Management - First Section */}
            <Card className="shadow-md border-secondary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-secondary/30">
                        <FileText className="h-5 w-5 text-secondary" />
                      </div>
                      CV Management
                    </CardTitle>
                    <CardDescription>Upload or replace your CV (PDF, max 5MB)</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="autofill-cv" className="text-sm cursor-pointer">
                      Autofill information from CV
                    </Label>
                    <Switch
                      id="autofill-cv"
                      checked={profile.autofill_from_cv}
                      onCheckedChange={(checked) => {
                        const updated = { ...profile, autofill_from_cv: checked };
                        setProfile(updated);
                        handleAutoSave("autofill_from_cv", checked);
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.cv_url && (
                  <div className="p-4 bg-muted/80 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">Your CV</p>
                        <p className="text-sm text-muted-foreground">Uploaded and ready</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewCV}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View CV
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteCV}
                        className="flex-1"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {profile.cv_url ? "Replace your CV" : "Upload your CV"}
                  </p>
                  <label htmlFor="cv-upload">
                    <Button
                      variant="hero"
                      disabled={uploading}
                      onClick={() => document.getElementById("cv-upload")?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploading ? "Uploading..." : "Choose File"}
                    </Button>
                  </label>
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleCVUpload}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-primary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/30">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  Personal Information
                </CardTitle>
                <CardDescription>Your basic contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profile.name}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profile.family_name}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone_number}
                    onChange={(e) =>
                      setProfile({ ...profile, phone_number: e.target.value })
                    }
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profile.country}
                      onChange={(e) =>
                        setProfile({ ...profile, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profile.date_of_birth}
                      onChange={(e) =>
                        setProfile({ ...profile, date_of_birth: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Links Section */}
            <Card className="shadow-md border-accent/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/30">
                    <LinkIcon className="h-5 w-5 text-accent" />
                  </div>
                  Links
                </CardTitle>
                <CardDescription>Your professional profiles and portfolios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </Label>
                  <Input
                    id="github"
                    value={profile.github_url}
                    onChange={(e) =>
                      setProfile({ ...profile, github_url: e.target.value })
                    }
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    value={profile.linkedin_url}
                    onChange={(e) =>
                      setProfile({ ...profile, linkedin_url: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="huggingface" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Hugging Face
                  </Label>
                  <Input
                    id="huggingface"
                    value={profile.huggingface_url}
                    onChange={(e) =>
                      setProfile({ ...profile, huggingface_url: e.target.value })
                    }
                    placeholder="https://huggingface.co/username"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card className="shadow-md border-primary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/30">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  Education
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Add your educational background
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.education.map((edu, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-primary/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeEducation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, "degree", e.target.value)}
                          placeholder="e.g., Bachelor of Science"
                        />
                      </div>
                      <div>
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducation(index, "field", e.target.value)}
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, "institution", e.target.value)}
                          placeholder="e.g., University Name"
                        />
                      </div>
                      <div>
                        <Label>Starting Year</Label>
                        <Input
                          value={edu.start_year}
                          onChange={(e) => updateEducation(index, "start_year", e.target.value)}
                          placeholder="e.g., 2016"
                        />
                      </div>
                      <div>
                        <Label>Ending Year</Label>
                        <Input
                          value={edu.end_year}
                          onChange={(e) => updateEducation(index, "end_year", e.target.value)}
                          placeholder="Leave empty if current"
                          disabled={edu.is_present}
                        />
                        <div className="col-span-2 flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            id={`edu-present-${index}`}
                            checked={!!edu.is_present}
                            onChange={(e) => updateEducation(index, "is_present", e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <Label htmlFor={`edu-present-${index}`} className="cursor-pointer">
                            I currently study here
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addEducation} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Education
                </Button>
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card className="shadow-md border-accent/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/30">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Work Experience
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Add your professional experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.work_experience.map((exp, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-accent/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeWorkExperience(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Job Title</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => updateWorkExperience(index, "title", e.target.value)}
                          placeholder="e.g., Software Engineer"
                        />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateWorkExperience(index, "company", e.target.value)}
                          placeholder="e.g., Tech Corp"
                        />
                      </div>
                      <div>
                        <Label>Starting Year</Label>
                        <Input
                          value={exp.start_year}
                          onChange={(e) => updateWorkExperience(index, "start_year", e.target.value)}
                          placeholder="e.g., 2020"
                        />
                      </div>
                      <div>
                        <Label>Ending Year</Label>
                        <Input
                          value={exp.end_year}
                          onChange={(e) => updateWorkExperience(index, "end_year", e.target.value)}
                          placeholder="Leave empty if current"
                          disabled={exp.is_present}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`present-${index}`}
                          checked={exp.is_present}
                          onChange={(e) => updateWorkExperience(index, "is_present", e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={`present-${index}`} className="cursor-pointer">
                          I currently work here
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={exp.description}
                        onChange={(e) => updateWorkExperience(index, "description", e.target.value)}
                        placeholder="Describe your role and achievements..."
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={addWorkExperience} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Work Experience
                </Button>
              </CardContent>
            </Card>

            {/* Certificates */}
            <Card className="shadow-md border-secondary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/30">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  Certificates
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Add your professional certifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.certificates.map((cert, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-secondary/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeCertificate(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Certificate Name</Label>
                        <Input
                          value={cert.name}
                          onChange={(e) => updateCertificate(index, "name", e.target.value)}
                          placeholder="e.g., AWS Certified Developer"
                        />
                      </div>
                      <div>
                        <Label>Issuing Organization</Label>
                        <Input
                          value={cert.issuer}
                          onChange={(e) => updateCertificate(index, "issuer", e.target.value)}
                          placeholder="e.g., Amazon Web Services"
                        />
                      </div>
                      <div>
                        <Label>Date Obtained</Label>
                        <Input
                          type="month"
                          value={cert.date}
                          onChange={(e) => updateCertificate(index, "date", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addCertificate} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certificate
                </Button>
              </CardContent>
            </Card>

            {/* Papers & Publications */}
            <Card className="shadow-md border-primary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/30">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Papers & Publications
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Add your research papers and publications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.papers.map((paper, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-primary/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removePaper(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Title</Label>
                        <Input
                          value={paper.title}
                          onChange={(e) => updatePaper(index, "title", e.target.value)}
                          placeholder="e.g., Machine Learning in Healthcare"
                        />
                      </div>
                      <div>
                        <Label>Publication/Journal</Label>
                        <Input
                          value={paper.publication}
                          onChange={(e) => updatePaper(index, "publication", e.target.value)}
                          placeholder="e.g., IEEE Transactions"
                        />
                      </div>
                      <div>
                        <Label>Publication Date</Label>
                        <Input
                          type="month"
                          value={paper.date}
                          onChange={(e) => updatePaper(index, "date", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Link (DOI or URL)</Label>
                        <Input
                          value={paper.link}
                          onChange={(e) => updatePaper(index, "link", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addPaper} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Paper/Publication
                </Button>
              </CardContent>
            </Card>

            {/* Projects */}
            <Card className="shadow-md border-accent/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/30">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  Projects
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Showcase your personal or professional projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.projects.map((project, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-accent/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeProject(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="space-y-3">
                      <div>
                        <Label>Project Name</Label>
                        <Input
                          value={project.name}
                          onChange={(e) => updateProject(index, "name", e.target.value)}
                          placeholder="e.g., E-commerce Platform"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={project.description}
                          onChange={(e) => updateProject(index, "description", e.target.value)}
                          placeholder="Describe what the project does..."
                        />
                      </div>
                      <div>
                        <Label>Technologies Used</Label>
                        <Input
                          value={project.technologies}
                          onChange={(e) => updateProject(index, "technologies", e.target.value)}
                          placeholder="e.g., React, Node.js, MongoDB"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Starting Year</Label>
                          <Input
                            value={project.start_year}
                            onChange={(e) => updateProject(index, "start_year", e.target.value)}
                            placeholder="e.g., 2022"
                          />
                        </div>
                        <div>
                          <Label>Ending Year</Label>
                          <Input
                            value={project.end_year}
                            onChange={(e) => updateProject(index, "end_year", e.target.value)}
                            placeholder="e.g., 2023"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Project Link</Label>
                        <Input
                          value={project.link}
                          onChange={(e) => updateProject(index, "link", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addProject} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </CardContent>
            </Card>

            {/* Other Sections */}
            <Card className="shadow-md border-secondary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/30">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Other
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Add any additional information about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.other_sections.map((section, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg relative hover:border-secondary/30 transition-colors bg-muted/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeOtherSection(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="space-y-3">
                      <div>
                        <Label>Section Title</Label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateOtherSection(index, "title", e.target.value)}
                          placeholder="e.g., Languages, Hobbies, Awards..."
                        />
                      </div>
                      <div>
                        <Label>Section Description</Label>
                        <textarea
                          value={section.description}
                          onChange={(e) => updateOtherSection(index, "description", e.target.value)}
                          placeholder="Describe this section..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addOtherSection} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-md border-secondary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-secondary/30">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  Interests
                </CardTitle>
                <CardDescription>
                  Add your professional interests and skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {profile.interests.map((interest, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm">
                      {interest}
                      <button
                        onClick={() => handleRemoveInterest(interest)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an interest..."
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddInterest()}
                  />
                  <Button onClick={handleAddInterest} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preferred Job Categories */}
            <Card className="shadow-md border-primary/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/30">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  Preferred Category Jobs
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Select the job categories you're interested in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategorySelector
                  selectedCategories={profile.preferred_categories}
                  onCategoryToggle={handlePreferredCategoryToggle}
                  label=""
                  description=""
                />
              </CardContent>
            </Card>

            {/* Preferred Job Types */}
            <Card className="shadow-md border-accent/20 bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/30">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  Preferred Job Types
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Optional - Select your preferred employment types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fulltime-toggle" className="text-base cursor-pointer">Full-time</Label>
                  <Switch
                    id="fulltime-toggle"
                    checked={profile.preferred_job_types.includes("full-time")}
                    onCheckedChange={() => handlePreferredJobTypeToggle("full-time")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="parttime-toggle" className="text-base cursor-pointer">Part-time</Label>
                  <Switch
                    id="parttime-toggle"
                    checked={profile.preferred_job_types.includes("part-time")}
                    onCheckedChange={() => handlePreferredJobTypeToggle("part-time")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="contract-toggle" className="text-base cursor-pointer">Contract</Label>
                  <Switch
                    id="contract-toggle"
                    checked={profile.preferred_job_types.includes("contract")}
                    onCheckedChange={() => handlePreferredJobTypeToggle("contract")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Unified Save Button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[200px]"
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
