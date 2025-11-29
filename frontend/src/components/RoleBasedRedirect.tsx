import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RoleBasedRedirectProps {
  children: React.ReactNode;
  requiredRole?: "job_seeker" | "recruiter";
}

export const RoleBasedRedirect = ({ children, requiredRole }: RoleBasedRedirectProps) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        if (!requiredRole) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          navigate("/auth");
          return;
        }

        if (roleData?.role === requiredRole) {
          setHasAccess(true);
        } else if (roleData?.role === "recruiter") {
          navigate("/dashboard/recruiter");
        } else {
          navigate("/profile-assistant");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [navigate, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
