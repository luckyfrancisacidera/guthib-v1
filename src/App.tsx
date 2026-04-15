import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import NewRepo from "./pages/NewRepo";
import RepoDetail from "./pages/RepoDetail";
import NewIssue from "./pages/NewIssue";
import IssueDetail from "./pages/IssueDetail";
import UserProfile from "./pages/UserProfile";
import NewPullRequest from "./pages/NewPullRequest";
import NewDiscussion from "./pages/NewDiscussion";
import DiscussionDetail from "./pages/DiscussionDetail";
import Notifications from "./pages/Notifications";
import Explore from "./pages/Explore";
import SearchPage from "./pages/SearchPage";
import HomePage from "./pages/HomePage";
import TaskBoards from "./pages/TaskBoards";
import BoardDetail from "./pages/BoardDetail";
import Shop from "./pages/Shop";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><NewRepo /></ProtectedRoute>} />
            <Route path="/boards" element={<ProtectedRoute><TaskBoards /></ProtectedRoute>} />
            <Route path="/boards/:boardId" element={<ProtectedRoute><BoardDetail /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/:username/:repoName" element={<ProtectedRoute><RepoDetail /></ProtectedRoute>} />
            <Route path="/:username/:repoName/issues/new" element={<ProtectedRoute><NewIssue /></ProtectedRoute>} />
            <Route path="/:username/:repoName/issues/:issueNumber" element={<ProtectedRoute><IssueDetail /></ProtectedRoute>} />
            <Route path="/:username/:repoName/pulls/new" element={<ProtectedRoute><NewPullRequest /></ProtectedRoute>} />
            <Route path="/:username/:repoName/discussions/new" element={<ProtectedRoute><NewDiscussion /></ProtectedRoute>} />
            <Route path="/:username/:repoName/discussions/:discussionId" element={<ProtectedRoute><DiscussionDetail /></ProtectedRoute>} />
            <Route path="/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
