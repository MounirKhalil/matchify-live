import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Briefcase,
  Users,
  Target,
  Inbox,
  Bookmark,
  BarChart,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navigationGroups = [
  {
    label: "MAIN",
    items: [
      { title: "Dashboard", url: "/dashboard/recruiter", icon: Home },
    ],
  },
  {
    label: "RECRUITMENT",
    items: [
      { title: "Jobs", url: "/recruiter/jobs", icon: Briefcase },
      { title: "Candidates", url: "/recruiter/candidates", icon: Users },
      { title: "Headhunt", url: "/recruiter/headhunting", icon: Target },
      { title: "Applications", url: "/recruiter/applications", icon: Inbox },
    ],
  },
  {
    label: "CANDIDATES",
    items: [
      { title: "Bookmarks", url: "/recruiter/bookmarks", icon: Bookmark },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { title: "Statistics", url: "/recruiter/statistics", icon: BarChart },
      { title: "AI Assistant", url: "/recruiter/chatbot", icon: MessageSquare },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { title: "Settings", url: "/recruiter/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  return (
    <Sidebar 
      collapsible="icon" 
      className={`border-r border-border/60 bg-card/95 backdrop-blur-sm transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <SidebarContent className="gap-0">
        {/* Logo Section */}
        <div className={`border-b border-border/60 bg-card flex items-center min-h-[4rem] transition-all ${
          collapsed ? "p-2 justify-center" : "p-4 justify-center"
        }`}>
          <NavLink 
            to="/dashboard/recruiter" 
            className="flex items-center gap-2.5 group"
          >
            <div className={`rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow transition-all group-hover:shadow-glow-purple group-hover:scale-105 flex-shrink-0 ${
              collapsed ? "h-9 w-9" : "h-10 w-10"
            }`}>
              <Sparkles className={`text-white transition-all ${collapsed ? "h-4 w-4" : "h-5 w-5"}`} />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-xl font-bold text-gradient leading-none whitespace-nowrap">
                  Matchify
                </h1>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  AI Automation Platform
                </span>
              </div>
            )}
          </NavLink>
        </div>

        {/* Navigation Groups */}
        <div className={`flex-1 overflow-y-auto transition-all ${collapsed ? "py-2 px-1" : "py-3 px-2"}`}>
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && (
                collapsed ? (
                  <Separator className="my-2 mx-auto w-6" />
                ) : (
                  <div className="mt-5" />
                )
              )}
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel className="px-2 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className={collapsed ? "gap-1" : "gap-0.5"}>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      const Icon = item.icon;
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={collapsed ? item.title : undefined}
                          >
                            <NavLink
                              to={item.url}
                              className={`flex items-center rounded-lg transition-all duration-200 ${
                                collapsed 
                                  ? "justify-center h-10 w-10 mx-auto" 
                                  : "gap-3 px-3 py-2.5"
                              } ${
                                isActive
                                  ? "bg-primary text-primary-foreground font-semibold shadow-md scale-105"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105"
                              }`}
                            >
                              <Icon className={`flex-shrink-0 ${collapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
                              {!collapsed && <span className="text-[15px]">{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
