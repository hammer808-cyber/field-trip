import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DevProvider } from './context/DevContext';
import { BottomNav } from './components/BottomNav';
import { DevTools } from './components/DevTools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BadgeCelebration } from './components/BadgeCelebration';
import { GameWrapper } from './components/GameWrapper';
import { BetaAccessGate } from './components/BetaAccessGate';
import { cn } from './lib/utils';

// Lazy load pages for binary size optimization
const Welcome = lazy(() => import('./pages/Welcome'));
const Quiz = lazy(() => import('./pages/Quiz'));
const PersonaResult = lazy(() => import('./pages/PersonaResult'));
const Deck = lazy(() => import('./pages/Deck'));
const Zine = lazy(() => import('./pages/Zine'));
const Capture = lazy(() => import('./pages/Capture'));
const Frontlines = lazy(() => import('./pages/Frontlines'));
const Profile = lazy(() => import('./pages/Profile'));
const Crew = lazy(() => import('./pages/Crew'));
const AdminSkins = lazy(() => import('./pages/AdminSkins'));
const AdminChallenges = lazy(() => import('./pages/AdminChallenges'));
const AdminProofReview = lazy(() => import('./pages/AdminProofReview'));
const AdminModeration = lazy(() => import('./pages/AdminModeration'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

// Fallback loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-paper">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest uppercase opacity-40 italic">Initializing Systems...</p>
    </div>
  </div>
);

function AppLayout({ children }: { children: React.ReactNode }) {
  const { persona, personaQuizComplete, onboardingCompleted, user, hasConfirmedLegal, refreshConsent, loading, completeOnboarding } = useApp();
  const { isAdmin } = useTheme();
  const location = useLocation();

  // Handle auto-completion of onboarding when reaching deck
  React.useEffect(() => {
    if (user && personaQuizComplete && !onboardingCompleted && location.pathname === '/deck') {
      completeOnboarding();
    }
  }, [user, personaQuizComplete, onboardingCompleted, location.pathname, completeOnboarding]);

  if (loading) return <PageLoader />;

  // Auth Gate
  const isAuthPage = location.pathname === '/';
  if (!user && !isAuthPage) {
    return <Navigate to="/" replace />;
  }

  // Legal Gate
  if (user && !hasConfirmedLegal) {
    return <BetaAccessGate userId={user.uid} onAccepted={refreshConsent} />;
  }

  // Onboarding Stage 1: Persona Quiz
  const isPersonaQuizPage = location.pathname === '/onboarding';
  if (user && hasConfirmedLegal && !personaQuizComplete && !isPersonaQuizPage && !isAdmin) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding Stage 2: Starter Challenges (Solo Phase)
  // Route to deck if persona quiz is done but onboarding isn't. 
  // Allow /persona so they can see their result first.
  const isDeckPage = location.pathname === '/deck';
  const isPersonaPage = location.pathname === '/persona';
  
  if (user && hasConfirmedLegal && personaQuizComplete && !onboardingCompleted && !isDeckPage && !isPersonaPage && !isAdmin) {
    return <Navigate to="/deck" replace />;
  }

  const isCapturePage = location.pathname === '/capture';
  const showNav = user && (onboardingCompleted || isAdmin) && !isCapturePage;

  return (
    <div className="min-h-screen bg-paper pb-safe text-on-surface">
      <ErrorBoundary fallback={<div className="p-8 text-center bg-error/10 text-error">CRITICAL_SYSTEM_ERROR. REBOOT_REQUIRED.</div>}>
        <GameWrapper>
          <Suspense fallback={<PageLoader />}>
            <main className={cn(showNav && "pb-24")}>
              {children}
            </main>
          </Suspense>
        </GameWrapper>
      </ErrorBoundary>
      {showNav && <BottomNav />}
      <BadgeCelebration />
    </div>
  );
}

export default function App() {
  return (
    <DevProvider>
      <ThemeProvider>
        <AppProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding" element={<Quiz />} />
                <Route path="/persona" element={<PersonaResult />} />
                <Route path="/deck" element={<Deck />} />
                <Route path="/journal" element={<Zine />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/frontlines" element={<Frontlines />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/crew" element={<Crew />} />
                <Route path="/admin/skins" element={<AdminSkins />} />
                <Route path="/admin/challenges" element={<AdminChallenges />} />
                <Route path="/admin/proofs" element={<AdminProofReview />} />
                <Route path="/admin/moderation" element={<AdminModeration />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <DevTools />
            </AppLayout>
          </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </DevProvider>
  );
}
