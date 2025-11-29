import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const MigrateProfileImages = () => {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string[]>([]);
  const { toast } = useToast();

  const migrateImages = async () => {
    setMigrating(true);
    setProgress(0);
    setStatus([]);

    try {
      // Get all candidates with local image paths
      const { data: candidates, error: fetchError } = await supabase
        .from("candidate_profiles")
        .select("id, name, family_name, profile_image_url")
        .like("profile_image_url", "/profile_images/%");

      if (fetchError) throw fetchError;
      if (!candidates || candidates.length === 0) {
        toast({ title: "No images to migrate" });
        setMigrating(false);
        return;
      }

      setStatus([`Found ${candidates.length} candidates to migrate`]);
      const total = candidates.length;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const localPath = candidate.profile_image_url;
        
        if (!localPath) continue;

        try {
          // Extract filename from path
          const filename = localPath.split("/").pop();
          if (!filename) continue;

          setStatus(prev => [...prev, `Migrating ${candidate.name} ${candidate.family_name}...`]);

          // Fetch the image from public folder
          const response = await fetch(localPath);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${localPath}`);
          }

          const blob = await response.blob();
          const file = new File([blob], filename, { type: blob.type });

          // Upload to Supabase Storage
          const filePath = `${candidate.id}/${Date.now()}-${filename}`;
          const { error: uploadError } = await supabase.storage
            .from("profile_images")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from("profile_images")
            .getPublicUrl(filePath);

          // Update database
          const { error: updateError } = await supabase
            .from("candidate_profiles")
            .update({ profile_image_url: publicUrl })
            .eq("id", candidate.id);

          if (updateError) throw updateError;

          setStatus(prev => [...prev, `✓ Migrated ${candidate.name} ${candidate.family_name}`]);
        } catch (error) {
          console.error(`Error migrating ${candidate.name}:`, error);
          setStatus(prev => [...prev, `✗ Failed: ${candidate.name} ${candidate.family_name}`]);
        }

        setProgress(((i + 1) / total) * 100);
      }

      toast({ title: "Migration complete!", description: "All profile images have been migrated to storage" });
      setStatus(prev => [...prev, "✓ Migration complete!"]);
    } catch (error) {
      console.error("Migration error:", error);
      toast({ title: "Migration failed", description: String(error), variant: "destructive" });
      setStatus(prev => [...prev, `Error: ${String(error)}`]);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Migrate Profile Images to Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This utility will migrate all profile images from the public folder to Supabase Storage
            and update the database with the new URLs.
          </p>
          
          <Button onClick={migrateImages} disabled={migrating} className="w-full">
            {migrating ? "Migrating..." : "Start Migration"}
          </Button>

          {migrating && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center">{Math.round(progress)}%</p>
            </div>
          )}

          {status.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
              {status.map((msg, idx) => (
                <div key={idx} className="text-sm font-mono mb-1">
                  {msg}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrateProfileImages;
