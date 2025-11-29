import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";

interface RecruiterLayoutProps {
  children: React.ReactNode;
}

export const RecruiterLayout = ({ children }: RecruiterLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <SidebarInset className="flex-1 flex flex-col w-full min-w-0">
          {/* Minimal Top Bar - Just Sidebar Toggle */}
          <header className="h-14 border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm flex items-center px-4 flex-shrink-0">
            <SidebarTrigger className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gradient-mesh">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
