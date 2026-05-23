import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DevProvider } from './context/DevContext';
import { BottomNav } from './components/BottomNav';
import { DevTools } from './components/DevTools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RewardFeedback } from './components/RewardFeedback';
import { SignalLossBanner } from './components/SignalLossBanner';
import { GameWrapper } from './components/GameWrapper';
import { BetaAccessGate } from './components/BetaAccessGate';
import { cn } from './lib/utils';
import { firebaseError, getFirebaseInitError } from './lib/firebase';

const FirebaseConfigError = ({ error }: { error: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-paper p-6 text-on-surface font-mono">
    <div className="max-w-xl w-full border-4 border-on-surface p-8 space-y-6 bg-white shadow-[12px_12px_0px_#ff3131]">
      <div className="flex items-center gap-3 text-on-surface">
        <div className="w-4 h-4 bg-error animate-pulse" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">Firebase_Init_Failure</h1>
      </div>
      
      <div className="space-y-4">
        <div className="bg-error/5 p-6 border-l-8 border-error">
          <p className="text-[10px] text-error font-black uppercase mb-2 tracking-widest">Diagnostic_Message:</p>
          <p className="text-sm font-bold leading-relaxed">{error}</p>
        </div>

        <div className="space-y-3 opacity-60">
          <p className="text-[10px] uppercase font-bold tracking-wider">Required_Actions:</p>
          <ul className="text-xs space-y-2 list-disc list-inside">
            <li>Check AI Studio Settings &gt; Secrets</li>
            <li>Ensure VITE_FIREBASE_PROJECT_ID is set correctly</li>
            <li>Verify all VITE_FIREBASE_* variables are active</li>
            <li>Wait for environment to propagate after secrets update</li>
          </ul>
        </div>
      </div>

      <button 
        onClick={() => window.location.reload()} 
        className="w-full py-5 bg-on-surface hover:bg-error text-white font-black transition-all uppercase tracking-widest text-sm translate-y-0 active:translate-y-1 shadow-[4px_4px_0px_black]"
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
const Capture = lazy(() => import('./pages/Capture'));
const Frontlines = lazy(() => import('./pages/Frontlines'));
const Profile = lazy(() => import('./pages/Profile'));
const FieldIdentity = lazy(() => import('./pages/FieldIdentity'));
const Classification = lazy(() => import('./pages/Classification'));
const Crew = lazy(() => import('./pages/Crew'));
const BigBoard = lazy(() => import('./pages/BigBoard'));
const VotingHubPage = lazy(() => import('./pages/VotingHubPage'));
const VotingBallotPage = lazy(() => import('./pages/VotingBallotPage'));
const SnitchCouncilPage = lazy(() => import('./pages/SnitchCouncilPage'));
const WeeklyAwardsPage = lazy(() => import('./pages/WeeklyAwardsPage'));
const AdminSkins = lazy(() => import('./pages/AdminSkins'));
const AdminChallenges = lazy(() => import('./pages/AdminChallenges'));
const AdminProofReview = lazy(() => import('./pages/AdminProofReview'));
const AdminModeration = lazy(() => import('./pages/AdminModeration'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminLeaderboard = lazy(() => import('./pages/AdminLeaderboard'));
const AdminQALenses = lazy(() => import('./pages/AdminQALenses'));
const AdminDevTools = lazy(() => import('./pages/AdminDevTools'));
const Banned = lazy(() => import('./pages/Banned'));
const Collection = lazy(() => import('./pages/Collection'));

// Fallback loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-paper">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-xs tracking-widest uppercase opacity-40 italic">Initializing Systems...</p>
    </div>
  </div>
);

const SystemError = ({ error, onRetry, onSignOut }: { error: string, onRetry: () => void, onSignOut: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-paper p-6 text-on-surface font-mono">
    <div className="max-w-xl w-full border-4 border-on-surface p-8 space-y-6 bg-white shadow-[12px_12px_0px_var(--color-brand-orange)]">
      <div className="flex items-center gap-3 text-on-surface">
        <div className="w-4 h-4 bg-brand-orange animate-pulse" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">Bureau_System_Handshake_Failed</h1>
      </div>
      
      <div className="space-y-4">
        <div className="bg-brand-orange/5 p-6 border-l-8 border-brand-orange">
          <p className="text-[10px] text-brand-orange font-black uppercase mb-2 tracking-widest">System_Error:</p>
          <div className="bg-white border-2 border-on-surface/10 p-3 font-mono text-[10px] overflow-auto max-h-40 text-on-surface/80 break-all leading-tight">
            {error}
          </div>
        </div>

        <div className="p-4 bg-brand-orange/5 border border-on-surface/10">
          <p className="text-[10px] uppercase font-bold tracking-wider mb-2">Protocol_Notes:</p>
          <p className="text-[11px] leading-relaxed opacity-60">
            Permission denied when accessing bureau assets. This usually occurs during account initialization or if your beta clearance status is pending. 
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={onSignOut} 
          className="py-4 border-4 border-on-surface hover:bg-on-surface hover:text-white font-black transition-all uppercase tracking-widest text-xs"
        >
          Sign Out
        </button>
        <button 
          onClick={onRetry} 
          className="py-4 bg-on-surface text-white font-black transition-all uppercase tracking-widest text-xs shadow-[6px_6px_0px_var(--color-brand-lime)] hover:bg-brand-orange"
        >
          Retry Handshake
        </button>
      </div>
    </div>
  </div>
);

function AppLayout({ children }: { children: React.ReactNode }) {
  const { fieldType, fieldClassificationComplete, onboardingCompleted, user, profile, hasConfirmedLegal, refreshConsent, loading, error, completeOnboarding, signOut } = useApp();
  const { isAdmin } = useTheme();
  const location = useLocation();

  // Admin Guard
  if (location.pathname.startsWith('/admin') && !isAdmin && !loading) {
    return <Navigate to="/deck" replace />;
  }

  // Handle auto-completion of onboarding when reaching deck
  React.useEffect(() => {
    if (user && fieldClassificationComplete && !onboardingCompleted && location.pathname === '/deck') {
      completeOnboarding();
    }
  }, [user, fieldClassificationComplete, onboardingCompleted, location.pathname, completeOnboarding]);

  if (error && user) {
    return <SystemError error={error} onRetry={() => window.location.reload()} onSignOut={signOut} />;
  }

  if (loading) return <PageLoader />;

  // Auth Gate
  const isAuthPage = location.pathname === '/';
  if (!user && !isAuthPage) {
    return <Navigate to="/" replace />;
  }

  // Banned Gate
  const isBannedPage = location.pathname === '/banned';
  const isBanned = profile?.accessStatus === 'banned' || (profile?.accessStatus as string) === 'suspended';
  if (user && isBanned && !isBannedPage) {
    return <Navigate to="/banned" replace />;
  }
  if (user && !isBanned && isBannedPage) {
    return <Navigate to="/deck" replace />;
  }

  // Legal Gate
  if (user && !hasConfirmedLegal) {
    return <BetaAccessGate userId={user.uid} onAccepted={refreshConsent} />;
  }

  // Onboarding Stage 1: Field Classification
  const isClassificationPage = location.pathname === '/classification';
  if (user && hasConfirmedLegal && !fieldClassificationComplete && !isClassificationPage && !isAdmin) {
    return <Navigate to="/classification" replace />;
  }

  // Onboarding Stage 2: Starter Challenges (Solo Phase)
  // Route to deck if classification is done but onboarding isn't. 
  // Allow /field-type so they can see their result first.
  const isDeckPage = location.pathname === '/deck';
  const isFieldTypePage = location.pathname === '/field-type';
  const isCapturePage = location.pathname === '/capture';
  
  if (user && hasConfirmedLegal && fieldClassificationComplete && !onboardingCompleted && !isDeckPage && !isFieldTypePage && !isClassificationPage && !isCapturePage && !isAdmin) {
    return <Navigate to="/deck" replace />;
  }

  const showNav = user && (onboardingCompleted || isAdmin) && !isCapturePage;

  return (
    <div className="min-h-screen bg-paper pb-safe text-on-surface">
      <SignalLossBanner />
      <ErrorBoundary fallback={<div className="p-8 text-center bg-error/10 text-error">CRITICAL_SYSTEM_ERROR. REBOOT_REQUIRED.</div>}>
        <GameWrapper>
          <Suspense fallback={<PageLoader />}>
            <main className={cn(showNav && "pb-20")}>
              {children}
            </main>
          </Suspense>
        </GameWrapper>
      </ErrorBoundary>
      {showNav && <BottomNav />}
      <RewardFeedback />
    </div>
  );
}

export default function App() {
  const initError = getFirebaseInitError();
  if (firebaseError || initError) return <FirebaseConfigError error={firebaseError || initError || 'Unknown initialization error'} />;

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
                <Route path="/journal" element={<Navigate to="/voting" replace />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/frontlines" element={<Frontlines />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/field-id" element={<FieldIdentity />} />
                <Route path="/classification" element={<Classification />} />
                <Route path="/crew" element={<Crew />} />
                <Route path="/big-board" element={<BigBoard />} />
                <Route path="/voting">
                  <Route index element={<VotingHubPage />} />
                  <Route path="ballot" element={<VotingBallotPage />} />
                  <Route path="council" element={<SnitchCouncilPage />} />
                  <Route path="awards" element={<WeeklyAwardsPage />} />
                </Route>
                <Route path="/admin/skins" element={<AdminSkins />} />
                <Route path="/admin/challenges" element={<AdminChallenges />} />
                <Route path="/admin/proofs" element={<AdminProofReview />} />
                <Route path="/admin/moderation" element={<AdminModeration />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
                <Route path="/admin/qa" element={<AdminQALenses />} />
                <Route path="/admin/dev-tools" element={<AdminDevTools />} />
                <Route path="/collection" element={<Collection />} />
                <Route path="/banned" element={<Banned />} />
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
