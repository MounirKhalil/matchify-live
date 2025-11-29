import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    familyName: string, 
    role: 'job_seeker' | 'recruiter',
    organizationName?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const metadata: Record<string, string> = {
        name,
        family_name: familyName,
        role,
      };

      if (role === 'recruiter' && organizationName) {
        metadata.organization_name = organizationName;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      if (error) throw error;

      // Supabase returns a user with empty identities[] if the email is already registered
      if (data.user && ((data.user as any).identities?.length ?? 0) === 0) {
        toast({
          title: "Email already registered",
          description: "Please sign in or reset your password instead.",
          variant: "destructive",
        });
        return { success: false, error: "This email is already registered. Please sign in instead." };
      }

      if (data.user) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
        return { success: true };
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clear any existing session first to prevent conflicts
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check user role to redirect appropriately
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Error fetching user role:", roleError);
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });

        // Redirect based on role
        if (roleData?.role === "recruiter") {
          navigate("/dashboard/recruiter");
        } else {
          navigate("/profile-assistant");
        }
        
        return { success: true };
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      // Clear all sessions
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear user state immediately
      setUser(null);
      setSession(null);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Please check your email for the reset link.",
      });
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
};
