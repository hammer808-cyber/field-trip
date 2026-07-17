import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Grid3X3,
  HelpCircle,
  Home,
  Images,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import {
  LOTERIA_BOARDS,
  LoteriaBoard,
  LoteriaCard,
  buildLoteriaPlayerPanel,
  getCompletedCardIdsForBoard,
  getDefaultLoteriaBoard,
  getRecentLoteriaMemories,
} from '../logic/loteriaExplore';

type LoteriaView = 'home' | 'boards' | 'active' | 'selector' | 'briefing' | 'results';

const accentClass: Record<LoteriaBoard['accent'], string> = {
  orange: 'bg-brand-orange text-white',
  lime: 'bg-brand-lime text-on-surface',
  cyan: 'bg-brand-cyan text-on-surface',
  magenta: 'bg-brand-magenta text-white',
};

const categoryClass: Record<LoteriaCard['category'], string> = {
  people: 'bg-brand-magenta',
  place: 'bg-brand-cyan',
  object: 'bg-brand-lime',
  receipt: 'bg-brand-orange',
  wildcard: 'bg-brand-yellow',
};

export default function LoteriaExploreBoard() {
  const navigate = useNavigate();
  const { entries, profile, xp, isOnboardingComplete } = useApp();
  const [view, setView] = React.useState<LoteriaView>('home');
  const [activeBoard, setActiveBoard] = React.useState<LoteriaBoard>(getDefaultLoteriaBoard());
  const [selectedCard, setSelectedCard] = React.useState<LoteriaCard>(getDefaultLoteriaBoard().cards[0]);
  const [markedCardIds, setMarkedCardIds] = React.useState<Set<string>>(new Set());

  const playerPanel = React.useMemo(() => buildLoteriaPlayerPanel({
    displayName: profile?.displayName || profile?.name || profile?.username,
    username: profile?.username,
    fieldTypeName: profile?.fieldTypeName || profile?.fieldType,
    xp,
  }), [profile, xp]);

  const approvedCardIds = React.useMemo(() => getCompletedCardIdsForBoard(entries, activeBoard), [entries, activeBoard]);
  const recentMemories = React.useMemo(() => getRecentLoteriaMemories(entries, 4), [entries]);
  const activeMarkedIds = React.useMemo(() => {
    const merged = new Set(markedCardIds);
    approvedCardIds.forEach((id) => merged.add(id));
    return merged;
  }, [approvedCardIds, markedCardIds]);
  const completionCount = activeMarkedIds.size;
  const isBoardComplete = completionCount >= activeBoard.cards.length;

  const selectBoard = (board: LoteriaBoard) => {
    setActiveBoard(board);
    setSelectedCard(board.cards[0]);
    setMarkedCardIds(new Set());
    setView('active');
  };

  const markCard = (card: LoteriaCard) => {
    setSelectedCard(card);
    setMarkedCardIds((current) => new Set(current).add(card.id));
    setView('briefing');
  };

  const openExistingMissionFlow = () => {
    navigate(`/missions?pack=${encodeURIComponent(selectedCard.deckId)}`);
  };

  return (
    <div className="min-h-screen bg-[#d8cb83] text-on-surface relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.18] bg-[radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)] [background-size:8px_8px]" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(90deg,transparent_0_49%,rgba(0,0,0,0.22)_50%,transparent_51%)] [background-size:46px_46px]" />

      <header className="sticky top-0 z-40 border-b-[5px] border-on-surface bg-[#d8cb83]/95 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => view === 'home' ? navigate('/big-board') : setView('home')}
            className="grid min-h-11 min-w-11 place-items-center border-[3px] border-on-surface bg-white shadow-[4px_4px_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label={view === 'home' ? 'Back to Big Board' : 'Back to Loteria home'}
          >
            {view === 'home' ? <ChevronLeft className="h-5 w-5 stroke-[3]" /> : <Home className="h-5 w-5 stroke-[3]" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="border-[3px] border-on-surface bg-black px-2 py-1 text-white shadow-[3px_3px_0_white]">
              <span className="font-display text-lg font-black uppercase italic leading-none">Loteria</span>
            </div>
            <span className="hidden font-mono text-[9px] font-black uppercase tracking-[0.25em] sm:inline">Explorer Board</span>
          </div>
          <button
            type="button"
            onClick={() => setView('boards')}
            className="grid min-h-11 min-w-11 place-items-center rounded-full border-[3px] border-on-surface bg-white shadow-[4px_4px_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label="Choose board"
          >
            <HelpCircle className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {view === 'home' && (
          <section className="space-y-8">
            <PlayerCard panel={playerPanel} />
            <div className="grid gap-4">
              <LoteriaButton label={`Continue ${activeBoard.title}`} variant="primary" icon={<Play />} onClick={() => setView('active')} />
              <LoteriaButton label="Choose New Board" variant="secondary" icon={<Grid3X3 />} onClick={() => setView('boards')} />
              <LoteriaButton label="Open Mission Deck" variant="secondary" icon={<Camera />} onClick={() => navigate('/missions')} />
            </div>

            <MemoryStrip memories={recentMemories} />
            <SeasonalBoards onSelect={selectBoard} isOnboardingComplete={isOnboardingComplete} />
          </section>
        )}

        {view === 'boards' && (
          <section className="space-y-6">
            <SectionTitle eyebrow="Pick your sheet" title="Choose Board" />
            <div className="grid gap-5 sm:grid-cols-2">
              {LOTERIA_BOARDS.map((board) => {
                const locked = board.deckId !== 'starter-signals' && !isOnboardingComplete;
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => !locked && selectBoard(board)}
                    disabled={locked}
                    className={cn(
                      'relative min-h-[220px] border-[4px] border-on-surface bg-white p-5 text-left shadow-[8px_8px_0_black] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-[3px_3px_0_black]',
                      locked && 'opacity-60',
                    )}
                  >
                    <div className={cn('mb-5 inline-flex border-[3px] border-on-surface px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest shadow-[3px_3px_0_black]', accentClass[board.accent])}>
                      {locked ? 'Locked' : 'Ready'}
                    </div>
                    <h2 className="font-display text-4xl font-black uppercase italic leading-none">{board.title}</h2>
                    <p className="mt-3 max-w-sm text-sm font-bold leading-snug text-on-surface/65">{board.subtitle}</p>
                    <div className="mt-6 flex items-center justify-between font-mono text-[10px] font-black uppercase tracking-widest">
                      <span>{board.cardCount} Cards</span>
                      {locked ? <Lock className="h-5 w-5 stroke-[3]" /> : <ArrowRight className="h-5 w-5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {view === 'active' && (
          <section className="space-y-6">
            <ActiveBoardHeader board={activeBoard} completionCount={completionCount} complete={isBoardComplete} onResults={() => setView('results')} />
            <LoteriaGrid board={activeBoard} markedIds={activeMarkedIds} onCardClick={markCard} />
            <div className="grid gap-3 sm:grid-cols-2">
              <LoteriaButton label="Pick A Card" variant="primary" icon={<Grid3X3 />} onClick={() => setView('selector')} />
              <LoteriaButton label="Reset Sheet Marks" variant="secondary" icon={<RotateCcw />} onClick={() => setMarkedCardIds(new Set())} />
            </div>
          </section>
        )}

        {view === 'selector' && (
          <section className="space-y-6">
            <SectionTitle eyebrow={activeBoard.title} title="Card Selector" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {activeBoard.cards.map((card) => (
                <MiniLoteriaCard key={card.id} card={card} marked={activeMarkedIds.has(card.id)} onClick={() => markCard(card)} />
              ))}
            </div>
          </section>
        )}

        {view === 'briefing' && (
          <section className="space-y-6">
            <button
              type="button"
              onClick={() => setView('active')}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-on-surface bg-white px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0_black]"
            >
              <ChevronLeft className="h-4 w-4 stroke-[3]" />
              Back To Board
            </button>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
              <MiniLoteriaCard card={selectedCard} marked className="min-h-[360px]" />
              <div className="border-[4px] border-on-surface bg-white p-6 shadow-[10px_10px_0_black]">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-brand-orange">{selectedCard.code}</p>
                <h1 className="mt-2 font-display text-5xl font-black uppercase italic leading-[0.9]">{selectedCard.title}</h1>
                <p className="mt-5 border-l-[6px] border-brand-lime pl-4 text-lg font-black italic leading-snug">{selectedCard.prompt}</p>
                <div className="mt-6 border-[3px] border-on-surface bg-[#fafbe5] p-4 shadow-[5px_5px_0_black]">
                  <p className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/45">Proof hint</p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-on-surface/75">{selectedCard.proofHint}</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <LoteriaButton label="Open Mission Flow" variant="primary" icon={<Camera />} onClick={openExistingMissionFlow} />
                  <LoteriaButton label="Mark On Sheet" variant="secondary" icon={<Check />} onClick={() => setMarkedCardIds((current) => new Set(current).add(selectedCard.id))} />
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'results' && (
          <section className="space-y-6">
            <SectionTitle eyebrow="Board Results" title={isBoardComplete ? 'Sheet Complete' : 'Still Hunting'} />
            <div className="border-[4px] border-on-surface bg-white p-6 text-center shadow-[10px_10px_0_black] sm:p-10">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-[4px] border-on-surface bg-brand-lime shadow-[6px_6px_0_black]">
                <Trophy className="h-10 w-10 stroke-[3]" />
              </div>
              <h2 className="mt-6 font-display text-5xl font-black uppercase italic leading-none">{completionCount}/{activeBoard.cards.length}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-relaxed text-on-surface/65">
                These marks are an explorer-board layer only. Official XP, proof status, and deck completion still come from the normal mission approval flow.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <LoteriaButton label="Back To Sheet" variant="primary" icon={<Grid3X3 />} onClick={() => setView('active')} />
                <LoteriaButton label="Open Big Board" variant="secondary" icon={<Trophy />} onClick={() => navigate('/big-board')} />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PlayerCard({ panel }: { panel: ReturnType<typeof buildLoteriaPlayerPanel> }) {
  return (
    <section className="border-[4px] border-on-surface bg-[#d8cb83] p-4 shadow-[7px_7px_0_black]">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center border-[4px] border-on-surface bg-white shadow-[4px_4px_0_black]">
          <User className="h-10 w-10 stroke-[3]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">ID: LT-AUTH-012</p>
          <h1 className="truncate font-display text-3xl font-black uppercase italic leading-none">{panel.displayName}</h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-6 flex-1 border-[3px] border-on-surface bg-[#c4c2a2]">
              <div className="h-full bg-brand-orange" style={{ width: `${panel.xpProgressPercent}%` }} />
            </div>
            <span className="font-mono text-xs font-black uppercase">{panel.levelLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-brand-orange">{eyebrow}</p>
      <h1 className="inline-block bg-white/35 px-3 font-display text-5xl font-black uppercase italic leading-none shadow-[5px_5px_0_rgba(0,0,0,0.18)]">{title}</h1>
    </div>
  );
}

function LoteriaButton({ label, variant, icon, onClick }: { label: string; variant: 'primary' | 'secondary'; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-16 w-full items-center justify-center gap-3 border-[4px] border-on-surface px-5 py-4 font-display text-xl font-black uppercase italic shadow-[7px_7px_0_black] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-[3px_3px_0_black]',
        variant === 'primary' ? 'bg-brand-orange text-white' : 'bg-white text-on-surface',
      )}
    >
      <span className="[&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[3]" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function MemoryStrip({ memories }: { memories: ReturnType<typeof getRecentLoteriaMemories> }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <SectionTitle eyebrow="Archive" title="Your Memories" />
        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">See All</span>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-3">
        {memories.length === 0 ? (
          <div className="min-w-[260px] border-[4px] border-on-surface bg-white p-5 text-center shadow-[7px_7px_0_black]">
            <Images className="mx-auto h-10 w-10 stroke-[3] text-on-surface/40" />
            <p className="mt-3 font-display text-2xl font-black uppercase italic">No Prints Yet</p>
            <p className="mt-2 text-xs font-bold text-on-surface/55">Approved photo receipts will become board memories here.</p>
          </div>
        ) : memories.map((entry, index) => (
          <article
            key={entry.id}
            className={cn('min-w-[235px] border-[4px] border-on-surface bg-white p-3 shadow-[7px_7px_0_black]', index % 2 === 0 ? '-rotate-2' : 'rotate-2')}
          >
            <div className="aspect-[4/5] overflow-hidden border-[3px] border-on-surface bg-[#efefd9]">
              {entry.imageUrl || entry.photoUrl || entry.mediaUrl ? (
                <img src={entry.imageUrl || entry.photoUrl || entry.mediaUrl} alt={entry.tripTitle || entry.missionTitle || 'Approved Fieldtrip proof'} className="h-full w-full object-cover grayscale" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-center font-mono text-[10px] font-black uppercase text-on-surface/40">Storage Proof</div>
              )}
            </div>
            <h3 className="mt-3 truncate text-center font-display text-xl font-black uppercase italic">{entry.deckName || entry.tripTitle || 'Field Print'}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function SeasonalBoards({ onSelect, isOnboardingComplete }: { onSelect: (board: LoteriaBoard) => void; isOnboardingComplete: boolean }) {
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Packs" title="Seasonal Boards" />
      <div className="grid grid-cols-2 gap-4">
        {LOTERIA_BOARDS.map((board) => {
          const locked = board.deckId !== 'starter-signals' && !isOnboardingComplete;
          return (
            <button
              key={board.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && onSelect(board)}
              className={cn('border-[4px] border-on-surface bg-[#d8cb83] p-3 text-left shadow-[6px_6px_0_black]', locked && 'opacity-60')}
            >
              <div className="aspect-[1.45] border-[3px] border-on-surface bg-white p-2">
                <div className={cn('grid h-full place-items-center border-2 border-on-surface/20 font-display text-2xl font-black uppercase italic', accentClass[board.accent])}>
                  {locked ? <Lock className="h-8 w-8 stroke-[3]" /> : board.cards[0].icon}
                </div>
              </div>
              <h3 className="mt-3 font-display text-xl font-black uppercase leading-none">{board.title}</h3>
              <p className="mt-1 font-mono text-[10px] font-black uppercase text-brand-orange">{board.cardCount} cards</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActiveBoardHeader({ board, completionCount, complete, onResults }: { board: LoteriaBoard; completionCount: number; complete: boolean; onResults: () => void }) {
  return (
    <div className="border-[4px] border-on-surface bg-white p-4 shadow-[7px_7px_0_black]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-brand-orange">Active Sheet</p>
          <h1 className="font-display text-4xl font-black uppercase italic leading-none">{board.title}</h1>
        </div>
        <button type="button" onClick={onResults} className="grid min-h-12 min-w-12 place-items-center rounded-full border-[3px] border-on-surface bg-brand-lime shadow-[4px_4px_0_black]">
          <Trophy className="h-5 w-5 stroke-[3]" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Timer className="h-5 w-5 stroke-[3] text-brand-orange" />
        <div className="h-4 flex-1 border-[2px] border-on-surface bg-[#efefd9]">
          <div className={cn('h-full', complete ? 'bg-brand-lime' : 'bg-brand-orange')} style={{ width: `${Math.round((completionCount / board.cards.length) * 100)}%` }} />
        </div>
        <span className="font-mono text-[10px] font-black uppercase">{completionCount}/{board.cards.length}</span>
      </div>
    </div>
  );
}

function LoteriaGrid({ board, markedIds, onCardClick }: { board: LoteriaBoard; markedIds: Set<string>; onCardClick: (card: LoteriaCard) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-[5px] border-on-surface bg-[#4b0082] p-3 shadow-[10px_10px_0_black]">
      {board.cards.map((card) => (
        <MiniLoteriaCard key={card.id} card={card} marked={markedIds.has(card.id)} onClick={() => onCardClick(card)} compact />
      ))}
    </div>
  );
}

function MiniLoteriaCard({ card, marked = false, compact = false, className, onClick }: { card: LoteriaCard; marked?: boolean; compact?: boolean; className?: string; onClick?: () => void }) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex aspect-[0.72] w-full flex-col border-[3px] border-on-surface bg-white p-2 text-left shadow-[4px_4px_0_black]',
        onClick && 'transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none',
        className,
      )}
    >
      <div className={cn('h-3 w-full border-2 border-on-surface', categoryClass[card.category])} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[7px] font-black uppercase tracking-wider text-brand-orange">{card.code}</span>
        {marked && <Check className="h-4 w-4 stroke-[4] text-brand-orange" />}
      </div>
      <div className="my-2 grid flex-1 place-items-center border-[2px] border-on-surface bg-[#fafbe5] p-2">
        <span className={cn('font-display font-black uppercase italic leading-none text-center', compact ? 'text-lg' : 'text-4xl')}>{card.icon}</span>
      </div>
      <h3 className={cn('font-display font-black uppercase italic leading-none', compact ? 'text-[10px]' : 'text-lg')}>{card.title}</h3>
      {!compact && <p className="mt-2 line-clamp-3 text-xs font-bold leading-tight text-on-surface/60">{card.prompt}</p>}
      {marked && <div className="absolute inset-0 pointer-events-none bg-brand-lime/20 mix-blend-multiply" />}
    </Element>
  );
}
