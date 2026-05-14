import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DevProvider } from './context/DevContext';
import { BottomNav } from './components/BottomNav';
import { DevTools } from './components/DevTools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BadgeCelebration } from './components/BadgeCelebration';
import { SignalLossBanner } from './components/SignalLossBanner';
import { GameWrapper } from './components/GameWrapper';
import { BetaAccessGate } from './components/BetaAccessGate';
import { cn } from './lib/utils';
import { firebaseError } from './lib/firebase';

const FirebaseConfigError = ({ error }: { error: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6 text-white font-mono">
    <div className="max-w-xl w-full border-2 border-red-600 p-8 space-y-6 bg-red-950/10">
      <div className="flex items-center gap-3 text-red-500">
        <div className="w-3 h-3 bg-red-500 animate-pulse rounded-full" />
        <h1 className="text-2xl font-black uppercase tracking-tighter">Firebase_Init_Failure</h1>
      </div>
      
      <div className="space-y-4">
        <div className="bg-black/60 p-4 border-l-4 border-red-500">
          <p className="text-[10px] text-red-400 font-bold uppercase mb-1 tracking-widest">Diagnostic_Message:</p>
          <p className="text-sm leading-relaxed opacity-90">{error}</p>
        </div>

        <div className="space-y-3 opacity-60">
          <p className="text-[10px] uppercase font-bold tracking-wider">Required_Actions:</p>
          <ul className="text-xs space-y-2 list-disc list-inside">
            <li>Check AI Studio Settings &gt; Secrets</li>
            <li>Ensure VITE_FIREBASE_PROJECT_ID is set to "field-trip-495823"</li>
            <li>Verify all VITE_FIREBASE_* variables are active</li>
            <li>Wait for environment to propagate after secrets update</li>
          </ul>
        </div>
      </div>

      <button 
        onClick={() => window.location.reload()} 
        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black transition-all uppercase tracking-widest text-xs"
      >
        Re-Run Diagnostics
      </button>
    </div>
  </div>
);

// Lazy load pages for binary size optimization
const Welcome = lazy(() => import('./pages/Welcome'));
const Quiz = lazy(() => import('./pages/Quiz'));
const FieldTypeResult = lazy(() => import('./pages/FieldTypeResult'));
const Deck = lazy(() => import('./pages/Deck'));
const Zine = lazy(() => import('./pages/Zine'));
const Capture = lazy(() => import('./pages/Capture'));
const Frontlines = lazy(() => import('./pages/Frontlines'));
const Profile = lazy(() => import('./pages/Profile'));
const FieldIdentity = lazy(() => import('./pages/FieldIdentity'));
const Classification = lazy(() => import('./pages/Classification'));
const Crew = lazy(() => import('./pages/Crew'));
const AdminSkins = lazy(() => import('./pages/AdminSkins'));
const AdminChallenges = lazy(() => import('./pages/AdminChallenges'));
const AdminProofReview = lazy(() => import('./pages/AdminProofReview'));
const AdminModeration = lazy(() => import('./pages/AdminModeration'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminLeaderboard = lazy(() => import('./pages/AdminLeaderboard'));
const AdminQALenses = lazy(() => import('./pages/AdminQALenses'));

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
  const { fieldType, fieldClassificationComplete, onboardingCompleted, user, hasConfirmedLegal, refreshConsent, loading, completeOnboarding } = useApp();
  const { isAdmin } = useTheme();
  const location = useLocation();

  // Handle auto-completion of onboarding when reaching deck
  React.useEffect(() => {
    if (user && fieldClassificationComplete && !onboardingCompleted && location.pathname === '/deck') {
      completeOnboarding();
    }
  }, [user, fieldClassificationComplete, onboardingCompleted, location.pathname, completeOnboarding]);

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

  // Onboarding Stage 1: Field Classification
  const isClassificationPage = location.pathname === '/onboarding';
  if (user && hasConfirmedLegal && !fieldClassificationComplete && !isClassificationPage && !isAdmin) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding Stage 2: Starter Challenges (Solo Phase)
  // Route to deck if classification is done but onboarding isn't. 
  // Allow /field-type so they can see their result first.
  const isDeckPage = location.pathname === '/deck';
  const isFieldTypePage = location.pathname === '/field-type';
  
  if (user && hasConfirmedLegal && fieldClassificationComplete && !onboardingCompleted && !isDeckPage && !isFieldTypePage && !isAdmin) {
    return <Navigate to="/deck" replace />;
  }

  const isCapturePage = location.pathname === '/capture';
  const showNav = user && (onboardingCompleted || isAdmin) && !isCapturePage;

  return (
    <div className="min-h-screen bg-paper pb-safe text-on-surface">
      <SignalLossBanner />
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
  if (firebaseError) return <FirebaseConfigError error={firebaseError} />;

  return (
    <DevProvider>
      <ThemeProvider>
        <AppProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding" element={<Quiz />} />
                <Route path="/field-type" element={<FieldTypeResult />} />
                <Route path="/persona" element={<Navigate to="/field-type" replace />} />
                <Route path="/deck" element={<Deck />} />
                <Route path="/journal" element={<Zine />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/frontlines" element={<Frontlines />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/field-id" element={<FieldIdentity />} />
                <Route path="/classification" element={<Classification />} />
                <Route path="/crew" element={<Crew />} />
                <Route path="/admin/skins" element={<AdminSkins />} />
                <Route path="/admin/challenges" element={<AdminChallenges />} />
                <Route path="/admin/proofs" element={<AdminProofReview />} />
                <Route path="/admin/moderation" element={<AdminModeration />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
                <Route path="/admin/qa" element={<AdminQALenses />} />
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
