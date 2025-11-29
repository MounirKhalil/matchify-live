import { useState, useEffect } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  Settings as SettingsIcon,
  Trash2,
  LogOut,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const RecruiterSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      toast({ title: "Signed out", description: "You have been signed out successfully." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      setDeleting(true);

      const { data: files } = await supabase.storage.from('cvstorage').list(user.id);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage.from('cvstorage').remove(filePaths);
      }

      await supabase.from('recruiter_profiles').delete().eq('user_id', user.id);
      await supabase.from('candidate_profiles').delete().eq('user_id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);

      const { error: deleteError } = await supabase.rpc('delete_user' as any);
      if (deleteError) {
        console.error('Delete user error:', deleteError);
        toast({ title: "Error deleting account", description: deleteError.message, variant: "destructive" });
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      toast({ title: "Account deleted", description: "Your account and all associated data have been permanently deleted." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Error deleting account", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RecruiterLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Settings</h1>
          <p className="text-muted-foreground text-lg">Manage your account preferences and settings</p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Password & Security
                </CardTitle>
                <CardDescription>Update your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button variant="outline">
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                  Account Actions
                </CardTitle>
                <CardDescription>Manage your session and account</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Delete Account</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        {deleting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your account and remove all your data from our servers. This includes:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your profile information</li>
                            <li>Your CV and uploaded documents</li>
                            <li>Your application history</li>
                            <li>All account preferences</li>
                          </ul>
                          <p className="mt-2 font-semibold">This action cannot be undone.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete My Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterSettings;
