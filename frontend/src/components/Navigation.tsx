import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  Briefcase,
  FileText,
  MessageSquare,
  User,
  Settings,
  Sparkles,
  Search,
  Users,
  Target,
  Inbox,
  Bookmark,
  BarChart,
  Linkedin,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  userType: "seeker" | "recruiter";
}

interface NavLink {
  to: string;
  icon: any;
  label: string;
  highlight?: boolean;
}

export const Navigation = ({ userType }: NavigationProps) => {
  const location = useLocation();

  const seekerLinks: NavLink[] = [
    { to: "/profile", icon: User, label: "Profile" },
    { to: "/opportunities", icon: Briefcase, label: "Opportunities" },
    { to: "/applications", icon: FileText, label: "Applications" },
    { to: "/automater", icon: Bot, label: "Automater", highlight: true },
    { to: "/profile-assistant", icon: Sparkles, label: "ProfilePal" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const recruiterLinks: NavLink[] = [
    { to: "/dashboard/recruiter", icon: Home, label: "Dashboard" },
    { to: "/recruiter/jobs", icon: Briefcase, label: "Jobs" },
    { to: "/recruiter/linkedin", icon: Linkedin, label: "LinkedIn" },
    { to: "/recruiter/search", icon: Users, label: "Search" },
    { to: "/recruiter/headhunting", icon: Target, label: "Headhunt" },
    { to: "/recruiter/applications", icon: Inbox, label: "Applications" },
    { to: "/recruiter/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { to: "/recruiter/evaluations", icon: FileText, label: "Evaluations" },
    { to: "/recruiter/statistics", icon: BarChart, label: "Statistics" },
    { to: "/recruiter/chatbot", icon: MessageSquare, label: "AI Assistant" },
    { to: "/recruiter/settings", icon: Settings, label: "Settings" },
  ];

  const links = userType === "seeker" ? seekerLinks : recruiterLinks;

  return (
    <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow transition-all group-hover:shadow-glow-purple">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gradient leading-none">
                Matchify
              </h1>
              <span className="text-[10px] text-muted-foreground">AI Automation Platform</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5">
            {links.map((link) => {
              const isActive = location.pathname === link.to;
              const Icon = link.icon;
              
              return (
                <Button
                  key={link.to}
                  variant={isActive ? "default" : (link.highlight ? "hero" : "ghost")}
                  size="sm"
                  asChild
                  className={cn(
                    "relative transition-all",
                    isActive && "shadow-md",
                    link.highlight && "shadow-glow"
                  )}
                >
                  <Link to={link.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{link.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-rainbow rounded-full" />
                    )}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
