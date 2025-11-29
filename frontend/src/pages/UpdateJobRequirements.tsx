import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const UpdateJobRequirements = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<string>("");

  const updateJobRequirements = async () => {
    setIsUpdating(true);
    setStatus("Updating job requirements...");

    try {
      // Update the Devops job that has no requirements
      const { error } = await supabase
        .from("job_postings")
        .update({
          requirements: [
            { requirement: "3+ years of DevOps experience" },
            { requirement: "Expertise in Docker, Kubernetes, and CI/CD pipelines" },
            { requirement: "Experience with cloud platforms (AWS, Azure, or GCP)" },
            { requirement: "Strong scripting skills (Bash, Python, or similar)" },
            { requirement: "Experience with infrastructure as code (Terraform, CloudFormation)" },
          ],
        })
        .eq("id", "fcbb26e4-dc7e-4294-befb-05edcaa97bb0");

      if (error) {
        throw error;
      }

      setStatus("✅ Job requirements updated successfully!");
      toast.success("Job requirements updated successfully!");
    } catch (error: any) {
      console.error("Error updating job requirements:", error);
      setStatus(`❌ Error: ${error.message}`);
      toast.error("Failed to update job requirements");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    updateJobRequirements();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Update Job Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {status || "Preparing to update job requirements..."}
          </div>
          
          <Button 
            onClick={updateJobRequirements} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? "Updating..." : "Update Again"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateJobRequirements;
