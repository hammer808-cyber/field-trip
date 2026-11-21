import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIELD_TYPES, FIELD_TYPE_ALIASES, type FieldTypeId } from '../../constants/fieldTypes';
import {
  acceptCrewRequest,
  declineCrewRequest,
  getCommunitySpotlight,
  removeCrewMemberConnection,
  searchPlayers,
  sendCrewRequest,
} from '../../services/crewGraphService';
import {
  deriveCrewRelationshipState,
  getCrewPeerId,
  isValidPlayerSearchQuery,
  type PublicPlayerIdentity,
} from '../../logic/crewGraph';

function identityFromConnection(connection: any, viewerUserId: string): PublicPlayerIdentity {
  const peerId = getCrewPeerId(connection, viewerUserId) || '';
  const snapshot = connection.requesterId === viewerUserId ? connection.addresseeSnapshot : connection.requesterSnapshot;
  return {
    userId: peerId,
    displayName: snapshot?.displayName || 'Field Agent',
    username: snapshot?.username || null,
    fieldType: snapshot?.fieldType || null,
    fieldTypeName: snapshot?.fieldTypeName || null,
    avatar: snapshot?.avatar || null,
    level: snapshot?.level || null,
    levelTitle: snapshot?.levelTitle || null,
    photoURL: snapshot?.photoURL || null,
  };
}

function PlayerAvatar({ player }: { player: PublicPlayerIdentity }) {
  // The layered-avatar SVGs (AvatarPreview / AVATAR_MANIFEST) were never
  // shipped — public/assets/avatars/ does not exist in the repo or on the
  // live build (the asset URL returns the SPA fallback), so AvatarPreview
  // renders a blank white box for every player. Show the player's real
  // photo when the snapshot has one, otherwise the persona character art
  // for their field type — both exist, so the box is never blank.
  const fieldTypeId = (FIELD_TYPE_ALIASES[player.fieldType || ''] || player.fieldType || 'unclassified') as FieldTypeId;
  const character = FIELD_TYPES[fieldTypeId] || FIELD_TYPES.unclassified;
  const src = player.photoURL || character.avatarPath;
  return (
    <span className="block h-10 w-10 shrink-0 overflow-hidden border-2 border-on-surface bg-[var(--skin-surface-muted)]">
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={(event) => {
          const img = event.currentTarget;
          if (!img.dataset.fallback) {
            img.dataset.fallback = '1';
            img.src = character.avatarPath;
          }
        }}
      />
    </span>
  );
}

function PlayerCard({
  player,
  relationship,
  busy,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
  onOpen,
}: {
  player: PublicPlayerIdentity;
  relationship: string;
  busy: boolean;
  onAdd?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="border-[3px] border-on-surface bg-white px-3 py-2.5 shadow-[3px_3px_0px_black] flex items-center gap-3">
      <button type="button" onClick={onOpen} className="flex items-center gap-3 text-left min-w-0 flex-1">
        <PlayerAvatar player={player} />
        <span className="min-w-0">
          <span className="font-display font-black uppercase italic text-base leading-tight truncate block">{player.displayName}</span>
          <span className="font-mono text-xs uppercase tracking-widest opacity-55 truncate block">
            {player.username ? `@${player.username}` : 'Field agent'}
            {player.fieldTypeName ? ` / ${player.fieldTypeName}` : ''}
            {player.levelTitle ? ` / ${player.levelTitle}` : ''}
          </span>
        </span>
      </button>
      <span className="flex flex-wrap items-center justify-end gap-2 shrink-0">
        {relationship === 'none' && onAdd && (
          <button type="button" disabled={busy} onClick={onAdd} className="bureau-btn-sm bg-brand-lime text-on-surface">
            <UserPlus className="w-4 h-4" /> Add to Crew
          </button>
        )}
        {relationship === 'outgoing_request' && (
          <span className="font-mono text-xs font-black uppercase tracking-widest border-2 border-on-surface px-2.5 py-1.5">Request Sent</span>
        )}
        {relationship === 'incoming_request' && (
          <>
            <button type="button" disabled={busy} onClick={onAccept} className="bureau-btn-sm bg-brand-lime text-on-surface">
              <Check className="w-4 h-4" /> Accept
            </button>
            <button type="button" disabled={busy} onClick={onDecline} className="bureau-btn-sm bg-white text-on-surface">
              <X className="w-4 h-4" /> Decline
            </button>
          </>
        )}
        {relationship === 'accepted' && onRemove && (
          <button type="button" disabled={busy} onClick={onRemove} className="bureau-btn-sm bg-white text-on-surface">
            <UserMinus className="w-4 h-4" /> Remove
          </button>
        )}
      </span>
    </div>
  );
}

export function CrewPeopleHome() {
  const { user, crewGraph } = useApp();
  const navigate = useNavigate();
  const viewerUserId = user?.uid || '';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicPlayerIdentity[]>([]);
  const [spotlight, setSpotlight] = useState<PublicPlayerIdentity[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getCommunitySpotlight(6).then(setSpotlight).catch(() => setSpotlight([]));
  }, []);

  const acceptedPeople = useMemo(
    () => (crewGraph?.accepted || []).map(connection => identityFromConnection(connection, viewerUserId)),
    [crewGraph, viewerUserId],
  );
  const incomingPeople = useMemo(
    () => (crewGraph?.incoming || []).map(connection => identityFromConnection(connection, viewerUserId)),
    [crewGraph, viewerUserId],
  );
  const outgoingPeople = useMemo(
    () => (crewGraph?.outgoing || []).map(connection => identityFromConnection(connection, viewerUserId)),
    [crewGraph, viewerUserId],
  );

  const relationshipFor = (playerId: string) => {
    const connection = [...(crewGraph?.accepted || []), ...(crewGraph?.incoming || []), ...(crewGraph?.outgoing || []), ...(crewGraph?.blocked || [])]
      .find(item => getCrewPeerId(item, viewerUserId) === playerId);
    return deriveCrewRelationshipState({ viewerUserId, connection });
  };

  const runSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    if (!isValidPlayerSearchQuery(query)) {
      setResults([]);
      setError('Type at least 2 characters of a username.');
      return;
    }
    setSearching(true);
    try {
      setResults(await searchPlayers(query));
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const run = async (playerId: string, task: () => Promise<unknown>) => {
    setBusyId(playerId);
    setError(null);
    try {
      await task();
    } catch (err: any) {
      setError(err.message || 'Crew action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] opacity-45">My Crew</p>
        <h1 className="font-display text-5xl sm:text-6xl font-black uppercase italic leading-none">Your people</h1>
        <p className="font-serif italic text-sm opacity-70 max-w-xl">
          Fieldtrip starts solo. Add the players you actually want to play with.
        </p>
      </header>

      {error && (
        <p className="border-2 border-red-500 bg-red-50 p-3 font-mono text-xs font-black uppercase text-red-700">{error}</p>
      )}

      {incomingPeople.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-black uppercase italic">Incoming requests</h2>
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">{incomingPeople.length} Crew request{incomingPeople.length === 1 ? '' : 's'}</p>
          {incomingPeople.map(player => (
            <PlayerCard
              key={player.userId}
              player={player}
              relationship="incoming_request"
              busy={busyId === player.userId}
              onAccept={() => run(player.userId, () => acceptCrewRequest(player.userId))}
              onDecline={() => run(player.userId, () => declineCrewRequest(player.userId))}
              onOpen={() => navigate(`/players/${encodeURIComponent(player.username || player.userId)}`)}
            />
          ))}
        </div>
      )}

      {acceptedPeople.length === 0 ? (
        <div className="border-4 border-on-surface bg-white p-8 shadow-[8px_8px_0px_black] space-y-4 text-center">
          <Users className="w-12 h-12 mx-auto text-brand-orange" />
          <h2 className="font-display text-3xl font-black uppercase italic">Your Crew is empty</h2>
          <p className="font-serif italic opacity-70">Fieldtrip starts solo. Add people you actually want to play with.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-black uppercase italic">Accepted Crew</h2>
          {acceptedPeople.map(player => (
            <PlayerCard
              key={player.userId}
              player={player}
              relationship="accepted"
              busy={busyId === player.userId}
              onRemove={() => run(player.userId, () => removeCrewMemberConnection(player.userId))}
              onOpen={() => navigate(`/players/${encodeURIComponent(player.username || player.userId)}`)}
            />
          ))}
        </div>
      )}

      {outgoingPeople.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-black uppercase italic">Outgoing requests</h2>
          {outgoingPeople.map(player => (
            <PlayerCard
              key={player.userId}
              player={player}
              relationship="outgoing_request"
              busy={false}
              onOpen={() => navigate(`/players/${encodeURIComponent(player.username || player.userId)}`)}
            />
          ))}
        </div>
      )}

      <form onSubmit={runSearch} className="border-4 border-on-surface bg-[#FFFDF6] p-5 shadow-[6px_6px_0px_black] space-y-4" id="find-players">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          <h2 className="font-display text-2xl font-black uppercase italic">Find Players</h2>
        </div>
        <p className="font-serif italic text-sm opacity-65">Search a username on purpose. Fieldtrip will not list every player.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="username"
            className="flex-1 border-4 border-on-surface p-4 font-mono uppercase"
            minLength={2}
          />
          <button type="submit" disabled={searching} className="bureau-btn bg-brand-cyan text-on-surface">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="space-y-3">
          {results.map(player => (
            <PlayerCard
              key={player.userId}
              player={player}
              relationship={relationshipFor(player.userId)}
              busy={busyId === player.userId}
              onAdd={() => run(player.userId, () => sendCrewRequest({ userId: player.userId, username: player.username || undefined }))}
              onAccept={() => run(player.userId, () => acceptCrewRequest(player.userId))}
              onDecline={() => run(player.userId, () => declineCrewRequest(player.userId))}
              onRemove={() => run(player.userId, () => removeCrewMemberConnection(player.userId))}
              onOpen={() => navigate(`/players/${encodeURIComponent(player.username || player.userId)}`)}
            />
          ))}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-2xl font-black uppercase italic">Community Spotlight</h2>
        <p className="font-serif italic text-sm opacity-65">A few public players. This is not your Crew and does not add them to your feed.</p>
        {spotlight.length === 0 ? (
          <div className="border-4 border-dashed border-on-surface/20 p-6 font-mono text-xs uppercase opacity-50">No public spotlight yet.</div>
        ) : spotlight.map(player => (
          <PlayerCard
            key={player.userId}
            player={player}
            relationship={relationshipFor(player.userId)}
            busy={busyId === player.userId}
            onAdd={() => run(player.userId, () => sendCrewRequest({ userId: player.userId, username: player.username || undefined }))}
            onOpen={() => navigate(`/players/${encodeURIComponent(player.username || player.userId)}`)}
          />
        ))}
      </div>
    </section>
  );
}
