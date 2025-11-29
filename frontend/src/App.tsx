import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleBasedRedirect } from "./components/RoleBasedRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import Profile from "./pages/Profile";
import CandidateSearch from "./pages/CandidateSearch";
import RecruiterChatbot from "./pages/RecruiterChatbot";
import Applications from "./pages/Applications";
import Settings from "./pages/Settings";
import RecruiterSettings from "./pages/RecruiterSettings";
import JobPostings from "./pages/JobPostings";
import HeadHunting from "./pages/HeadHunting";
import HeadHuntingSimple from "./pages/HeadHuntingSimple";
import RecruiterApplications from "./pages/RecruiterApplications";
import BookmarkedCandidates from "./pages/BookmarkedCandidates";
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";
import ProfilePal from "./pages/ProfilePal";
import Opportunities from "./pages/Opportunities";
import Automater from "./pages/Automater";
import MigrateProfileImages from "./pages/MigrateProfileImages";
import UpdateJobRequirements from "./pages/UpdateJobRequirements";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<ProtectedRoute><RoleBasedRedirect><Profile /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/profile-assistant" element={<ProtectedRoute><RoleBasedRedirect requiredRole="job_seeker"><ProfilePal /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/opportunities" element={<ProtectedRoute><RoleBasedRedirect requiredRole="job_seeker"><Opportunities /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/automater" element={<ProtectedRoute><RoleBasedRedirect requiredRole="job_seeker"><Automater /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/dashboard/recruiter" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><RecruiterDashboard /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><RoleBasedRedirect requiredRole="job_seeker"><Applications /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><RoleBasedRedirect requiredRole="job_seeker"><Settings /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/settings" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><RecruiterSettings /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/candidates" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><CandidateSearch /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/chatbot" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><RecruiterChatbot /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/jobs" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><JobPostings /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/headhunting" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><HeadHunting /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/headhunting-simple" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><HeadHuntingSimple /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/applications" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><RecruiterApplications /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/bookmarks" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><BookmarkedCandidates /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/recruiter/statistics" element={<ProtectedRoute><RoleBasedRedirect requiredRole="recruiter"><Statistics /></RoleBasedRedirect></ProtectedRoute>} />
          <Route path="/migrate-images" element={<MigrateProfileImages />} />
          <Route path="/update-job-requirements" element={<UpdateJobRequirements />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
