import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DevProvider } from './context/DevContext';
import { BottomNav } from './components/BottomNav';
import { DevTools } from './components/DevTools';
import FieldKitOnboarding from './components/FieldKitOnboarding';
import { PageLoader } from './components/PageLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RewardFeedback } from './components/RewardFeedback';
import { SignalLossBanner } from './components/SignalLossBanner';
import { GameWrapper } from './components/GameWrapper';
import { BetaAccessGate } from './components/BetaAccessGate';
import { cn } from './lib/utils';
import { LAUNCH_MISSION_ID, isLaunchMissionEligible } from './data/specialMissions';
import { firebaseError, getFirebaseInitError } from './lib/firebase';
import { FieldGuideAssist } from './components/FieldGuideAssist';
import { StarterGate } from './components/StarterGate';

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
const AdminBoard = lazy(() => import('./pages/AdminBoard'));
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
const AdminArchiveSubmissions = lazy(() => import('./pages/AdminArchiveSubmissions'));
const Banned = lazy(() => import('./pages/Banned'));
const Collection = lazy(() => import('./pages/Collection'));
const Basecamp = lazy(() => import('./pages/Basecamp'));
const MissionBriefing = lazy(() => import('./pages/MissionBriefing'));
const MissionSubmitted = lazy(() => import('./pages/MissionSubmitted'));

const GlobalErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary fallback={(error: Error | null) => (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6 font-mono text-on-surface">
        <div className="max-w-4xl w-full border-4 border-on-surface p-8 space-y-6 bg-white shadow-[12px_12px_0px_#ff3131]">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-error animate-pulse" />
            <h1 className="text-2xl font-black uppercase tracking-tighter">FATAL_RUNTIME_FAILURE</h1>
          </div>
          <div className="bg-error/5 p-6 border-l-8 border-error space-y-4">
            <p className="text-[10px] text-error font-black uppercase tracking-widest">Diagnostic_Report:</p>
            <p className="text-sm font-bold leading-relaxed">
              The application encountered a critical error during initialization. This may be due to a failed connection to Bureau assets or a corrupted local cache.
            </p>
            
            <div className="mt-4 p-4 bg-black/5 rounded font-mono text-[10px] whitespace-pre-wrap overflow-auto max-h-[400px]">
              <p className="text-error font-black mb-1">[RUNTIME_EXCEPTION]</p>
              <div id="error-stack-trace" className="text-on-surface/80">
                {error ? (
                  <>
                    <p className="font-bold mb-2">{error.name}: {error.message}</p>
                    <pre className="opacity-70 leading-tight">
                      {error.stack}
                    </pre>
                  </>
                ) : (
                  "System encountered an unidentified exception. Check local console logs for full stack trace."
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.reload()} 
              className="py-4 border-4 border-on-surface hover:bg-on-surface hover:text-white font-black transition-all uppercase tracking-widest text-[10px]"
            >
              Retry Sync
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                // Try to clear IndexedDB as it might be corrupted for Firebase
                if (window.indexedDB) {
                  try {
                    const req = window.indexedDB.deleteDatabase('firestore/[DEFAULT]/field-trip-495823/main');
                    req.onsuccess = () => console.log('Firestore IDB Cleared');
                  } catch (e) {}
                }
                window.location.reload();
              }} 
              className="py-4 bg-on-surface text-white font-black hover:bg-error transition-all uppercase tracking-widest text-[10px] shadow-[4px_4px_0px_black]"
            >
              Clear Cache & Hard Reset
            </button>
          </div>
        </div>
      </div>
    )}>
      {children}
    </ErrorBoundary>
  );
};

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
  const { 
    fieldType, 
    fieldClassificationComplete, 
    onboardingCompleted, 
    user, 
    profile, 
    hasConfirmedLegal, 
    refreshConsent, 
    loading, 
    authLoading, 
    profileLoading, 
    error, 
    completeOnboarding, 
    signOut, 
    onboardingCompletedCount, 
    isOnboardingComplete, 
    hasCompletedFieldKitOnboarding, 
    currentDate, 
    submittedPendingChallengeIds, 
    mustCompleteStarterMission, 
    hasCompletedGuidedFirstEntry, 
    hasSeenFieldTypeResults,
    onboardingStarted,
    starterApprovedCount,
    activeMissionId,
    activeSubmissionStatus,
    isAdmin
  } = useApp();
  const { skin } = useTheme();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  console.log('[AppLayout] Render Init', { 
    path: location.pathname, 
    hasUser: !!user, 
    hasProfile: !!profile,
    authLoading,
    profileLoading,
    error: !!error
  });

  // Admin Route Access Debugging Logs
  React.useEffect(() => {
    if (user) {
      console.log('[Admin_Security_Check]', {
        uid: user.uid,
        path: location.pathname,
        isAdmin,
        onboardingCompleted: !!profile?.onboardingCompleted,
        starterProgress: `${onboardingCompletedCount}/3`,
        hasConfirmedLegal,
        decision: (isAdminRoute && !isAdmin) ? 'Redirect_To_Deck' : (isAdmin && isAdminRoute) ? 'Allow_Admin_Access' : 'Standard_Gameplay_Guards'
      });
    }
  }, [user, location.pathname, isAdmin, profile?.onboardingCompleted, onboardingCompletedCount, hasConfirmedLegal, isAdminRoute]);

  // Global scroll to top on route and param transitions
  React.useEffect(() => {
    // Ensuring it runs after render and potential frame updates
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate
    resetScroll();
    
    // Backup after frame to catch late renders or layout shifts
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [location.pathname, location.search]);

  // Admin Guard
  if (isAdminRoute && !isAdmin && !loading) {
    return <Navigate to="/deck" replace />;
  }

  // Bypass all gameplay gates for admins accessing admin routes
  const isBypassingGuards = isAdmin && isAdminRoute;

  // Onboarding tour completion is handled exclusively via Guided Tour steps.

  if (error && user) {
    console.error('[AppLayout] System Error Detected:', error);
    return <SystemError error={error} onRetry={() => window.location.reload()} onSignOut={signOut} />;
  }

  // Profile-specific system error if user exists but profile failed
  if (user && !profile && !profileLoading && !authLoading) {
    console.error('[AppLayout] User exists but Profile lookup returned null.');
    return <SystemError error="BUREAU_PROFILE_NOT_FOUND: Could not verify field agent clearance." onRetry={() => window.location.reload()} onSignOut={signOut} />;
  }

  // CRITICAL: Wait for AUTH and PROFILE to load before doing any redirects
  if (authLoading || (user && profileLoading && !profile)) {
    return <PageLoader />;
  }

  console.log('[App] Guard Debug:', {
    path: location.pathname,
    authLoading,
    profileLoading,
    hasUser: !!user,
    hasProfile: !!profile,
    fieldClassificationComplete,
    onboardingCompleted,
    hasConfirmedLegal
  });

  // Auth Gate
  const isAuthPage = location.pathname === '/';
  if (!user && !isAuthPage) {
    return <Navigate to="/" replace />;
  }

  if (!user) return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  );

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

  // Onboarding Routing Logic
  const isClassificationPage = location.pathname === '/classification' || location.pathname === '/onboarding';
  const isFieldTypePage = location.pathname === '/field-type' || location.pathname === '/persona';
  const isDeckPage = location.pathname === '/deck';
  const isCapturePage = location.pathname.startsWith('/capture');
  const isProfilePage = location.pathname === '/profile';
  const isBigBoardPage = location.pathname === '/big-board';
  const isBasecampPage = location.pathname === '/basecamp';
  const isVotingPage = location.pathname.startsWith('/voting');

  // Centralized login/returning destination selector
  let correctDestination = "/basecamp";
  if (!hasConfirmedLegal) {
    correctDestination = "/"; // BetaAccessGate will be shown
  } else if (!fieldClassificationComplete) {
    correctDestination = "/classification";
  } else if (!hasSeenFieldTypeResults) {
    correctDestination = "/field-type";
  } else if (!onboardingCompleted) {
    correctDestination = "/onboarding";
  } else if (activeSubmissionStatus === "needs_more_proof") {
    correctDestination = "/deck";
  } else if (starterApprovedCount < 3) {
    correctDestination = "/deck";
  } else {
    correctDestination = "/basecamp";
  }

  // Step 1: Force User to take Field Type Quiz first if they don't have a result
  if (user && hasConfirmedLegal && !fieldClassificationComplete && !isClassificationPage && !isBypassingGuards && !isAdmin) {
    return <Navigate to="/classification" replace />;
  }

  // Step 2: Force user to see persona results before proceeding
  if (user && hasConfirmedLegal && fieldClassificationComplete && !hasSeenFieldTypeResults && !isFieldTypePage && !isBypassingGuards && !isAdmin) {
    return <Navigate to="/field-type" replace />;
  }

  // Persona Results route should only be allowed when fieldClassificationComplete === true AND hasSeenFieldTypeResults !== true
  if (user && hasConfirmedLegal && isFieldTypePage && hasSeenFieldTypeResults && !isBypassingGuards && !isAdmin) {
    return <Navigate to={correctDestination} replace />;
  }

  // Prevent going back to Classification or Quiz pages if already completed
  if (user && fieldClassificationComplete && isClassificationPage && !isBypassingGuards) {
    return <Navigate to={correctDestination} replace />;
  }

  // Step 2.5: Field Kit Onboarding
  if (user && hasConfirmedLegal && fieldClassificationComplete && hasSeenFieldTypeResults && !hasCompletedFieldKitOnboarding && !isBypassingGuards) {
    return (
      <Suspense fallback={<PageLoader />}>
        <FieldKitOnboarding />
      </Suspense>
    );
  }

  // Step 3: Resume guided onboarding or mission at correct saved step.
  // Allow all pages used in the tour: Deck, Capture, Profile, Big Board, and Field Type.
  const isAllowedOnboardingPage = isDeckPage || isCapturePage || isProfilePage || isBigBoardPage || isFieldTypePage || isBasecampPage;
  if (user && hasConfirmedLegal && fieldClassificationComplete && hasSeenFieldTypeResults && !onboardingCompleted && !isAllowedOnboardingPage && !isBypassingGuards) {
    return <Navigate to="/deck" replace />;
  }

  // Step 4: Tribunal / Voting Guard
  // Voting is generally allowed, but nested tribunal council/awards might need gating
  const isTribunalCouncil = location.pathname === '/voting/council';
  if (isTribunalCouncil && !isOnboardingComplete && !isBypassingGuards) {
    return <Navigate to="/voting" replace />;
  }

  // Once onboarding is approved/complete, force guide them to /deck once to see the "Training Protocol Complete" screen
  if (user && hasConfirmedLegal && fieldClassificationComplete && isOnboardingComplete && !profile?.hasSeenDeckChooserIntro && !isDeckPage && !isBypassingGuards) {
    return <Navigate to="/deck" replace />;
  }

  // Redirect completed or uncompleted logged-in users away from Welcome page (isAuthPage) to avoid form flashes or being stranded
  if (user && hasConfirmedLegal && isAuthPage && !isBypassingGuards) {
    if (!fieldClassificationComplete) {
      return <Navigate to="/classification" replace />;
    }
    if (!hasSeenFieldTypeResults) {
      return <Navigate to="/field-type" replace />;
    }
    return <Navigate to={correctDestination} replace />;
  }

  const ONBOARDING_ROUTE_PREFIXES = [
    '/onboarding',
    '/classification',
    '/field-kit',
    '/permissions',
    '/field-type',
    '/persona',
    '/quiz',
    '/setup',
    '/welcome',
    '/vibe-check',
    '/field-id'
  ];

  const isOnboardingRoute = ONBOARDING_ROUTE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  const isGuidedModeActive = !hasCompletedGuidedFirstEntry;
  const isForcedMission = mustCompleteStarterMission;
  const hideHelpers = isCapturePage || ((isGuidedModeActive || isForcedMission) && !isAdmin);

  // Routes that must keep bottom nav
  const NAV_ROUTES = [
    '/basecamp',
    '/deck',
    '/missions',
    '/collection',
    '/voting',
    '/big-board',
    '/crews',
    '/crew',
    '/profile',
    '/logbook',
    '/settings',
    '/proofs',
    '/proof/',
    '/frontlines'
  ];

  const isUserFacingNavRoute = NAV_ROUTES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  // Persona results after onboarding is complete
  const isPersonaResultsAfterOnboarding = 
    (location.pathname === '/field-type' || location.pathname === '/persona') && onboardingCompleted;

  // The bottom nav must appear on all authenticated user-facing routes
  // unless the route is intentionally full-screen (viewfinder or admin or auth).
  const showNav = !!(
    user && 
    profile && 
    !isCapturePage && 
    !location.pathname.startsWith('/admin') && 
    location.pathname !== '/' && 
    location.pathname !== '/banned' &&
    (isUserFacingNavRoute || isPersonaResultsAfterOnboarding)
  );

  // Show a "Back to Basecamp" CTA if a user lands on any authenticated page without the bottom nav
  const showFallbackBackToBasecamp = !!(
    user && 
    profile && 
    !showNav && 
    !isCapturePage && 
    !location.pathname.startsWith('/admin') && 
    location.pathname !== '/' && 
    location.pathname !== '/banned' &&
    !isOnboardingRoute
  );

  console.log('[ONBOARDING_CHROME_VISIBILITY]', {
    path: location.pathname,
    onboardingCompleted: profile?.onboardingCompleted,
    mustCompleteStarterMission,
    isGuidedModeActive,
    isOnboardingRoute,
    shouldShowBottomNav: showNav,
    onboardingReady: isOnboardingComplete,
    showFallbackBackToBasecamp
  });

  return (
    <div className="min-h-screen text-on-surface relative overflow-x-hidden">
      <ErrorBoundary fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center p-8 font-mono">
          <div className="border-4 border-on-surface p-8 bg-white shadow-[8px_8px_0px_black] max-w-md text-center">
            <h2 className="text-xl font-black mb-4">COMPONENT_RENDER_FAILURE</h2>
            <p className="text-xs opacity-60 mb-6 font-bold">A specific UI module failed to synchronize. The rest of the system remains stable.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-on-surface text-white font-black uppercase text-[10px]">Re-Sync Component</button>
          </div>
        </div>
      }>
        {!hideHelpers && (
          <>
            <SignalLossBanner />
            <RewardFeedback />
            <DevTools />
            <FieldGuideAssist />
          </>
        )}
        <GameWrapper>
          <Suspense fallback={<PageLoader />}>
            <main className={cn(
              showNav ? "pb-[calc(110px+env(safe-area-inset-bottom,20px))] sm:pb-36" : "pb-safe"
            )}>
              {children}
            </main>
          </Suspense>
        </GameWrapper>
        {showNav && <BottomNav />}
        
        {showFallbackBackToBasecamp && (
          <div className="fixed bottom-6 right-6 z-[200] animate-bounce">
            <Link 
              to="/basecamp"
              className="flex items-center gap-2 px-5 py-3.5 bg-brand-orange text-white border-4 border-on-surface font-display font-black uppercase italic tracking-tight shadow-[6px_6px_0px_black] hover:bg-on-surface hover:text-brand-lime hover:shadow-[4px_4px_0px_var(--color-brand-orange)] transition-all rounded-xl text-xs"
            >
              <Home size={16} className="stroke-[3]" />
              Back to Basecamp
            </Link>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}

import { initializeFirebase } from './lib/firebaseInit';

export default function App() {
  // Ensure Firebase is initialized before any providers are rendered
  initializeFirebase();
  const initError = getFirebaseInitError();

  React.useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[GLOBAL_ERROR]', event.error || event.message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[UNHANDLED_REJECTION]', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (firebaseError || initError) return <FirebaseConfigError error={firebaseError || initError || 'Unknown initialization error'} />;

  return (
    <GlobalErrorBoundary>
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
                    <Route path="/basecamp" element={<Basecamp />} />
                    <Route path="/journal" element={<Navigate to="/voting" replace />} />
                    <Route path="/capture" element={<Capture />} />
                    <Route path="/frontlines" element={<Frontlines />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/logbook" element={<Profile />} />
                    <Route path="/field-id" element={<FieldIdentity />} />
                    <Route path="/classification" element={<Classification />} />
                    <Route path="/crew" element={<StarterGate requiredFeature="crew"><Crew /></StarterGate>} />
                    <Route path="/big-board" element={<StarterGate requiredFeature="leaderboard"><BigBoard /></StarterGate>} />
                    <Route path="/mission-briefing" element={<MissionBriefing />} />
                    <Route path="/mission-submitted" element={<MissionSubmitted />} />
                    <Route path="/voting">
                      <Route index element={<StarterGate requiredFeature="voting"><VotingHubPage /></StarterGate>} />
                      <Route path="ballot" element={<StarterGate requiredFeature="voting"><VotingBallotPage /></StarterGate>} />
                      <Route path="council" element={<StarterGate requiredFeature="voting"><SnitchCouncilPage /></StarterGate>} />
                      <Route path="awards" element={<StarterGate requiredFeature="voting"><WeeklyAwardsPage /></StarterGate>} />
                    </Route>
                    <Route path="/admin" element={<AdminBoard />} />
                    <Route path="/admin/skins" element={<AdminSkins />} />
                    <Route path="/admin/challenges" element={<AdminChallenges />} />
                    <Route path="/admin/proofs" element={<AdminProofReview />} />
                    <Route path="/admin/moderation" element={<AdminModeration />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
                    <Route path="/admin/qa" element={<AdminQALenses />} />
                    <Route path="/admin/dev-tools" element={<AdminDevTools />} />
                    <Route path="/admin/ops" element={<AdminDevTools />} />
                    <Route path="/admin/archive" element={<AdminArchiveSubmissions />} />
                    <Route path="/collection" element={<Collection />} />
                    <Route path="/banned" element={<Banned />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
            </BrowserRouter>
          </AppProvider>
        </ThemeProvider>
      </DevProvider>
    </GlobalErrorBoundary>
  );
}
