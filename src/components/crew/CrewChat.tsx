/**
 * Crew chat (Nov 20, 2026 — crew clubhouse).
 *
 * One channel per crew, realtime, newest at the bottom. @-mentions are
 * matched server-side against member usernames / first names and render
 * bold here.
 *
 * Messages arrive as a prop: the Crew page owns the subscription (so the
 * unread badge stays live on every tab, not just while this panel is
 * open). Opening the chat marks it seen — the panel calls `onSeen` and the
 * page clears the badge at once.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import {
  deleteCrewChatMessage,
  markCrewChatSeen,
  sendCrewChatMessage,
} from '../../services/crewChat';
import { MAX_CREW_CHAT_LENGTH, crewChatMessageMillis, todayLocalDay } from '../../logic/crewSocial';
import type { CrewChatMessage } from '../../types/crew';

export interface ChatMember {
  userId: string;
  displayName: string;
  username?: string | null;
}

function dayLabel(millis: number): string {
  if (!millis) return 'Today';
  const date = new Date(millis);
  const today = todayLocalDay();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${date.getFullYear()}-${month}-${day}`;
  if (key === today) return 'Today';
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterday.getDate()).padStart(2, '0');
  if (key === `${yesterday.getFullYear()}-${yMonth}-${yDay}`) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeLabel(millis: number): string {
  if (!millis) return '';
  return new Date(millis).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Render @-mentions bold. A token counts when it matches a member's username or first name. */
function renderMessageText(text: string, members: readonly ChatMember[]): React.ReactNode {
  const parts = text.split(/(@[A-Za-z0-9_.-]+)/g);
  return parts.map((part, index) => {
    if (!part.startsWith('@')) return part;
    const token = part.slice(1).toLowerCase();
    const isMention = members.some((member) => {
      const username = String(member.username || '').trim().toLowerCase();
      if (username && username === token) return true;
      const firstName = String(member.displayName || '').trim().split(/\s+/)[0]?.toLowerCase();
      return Boolean(firstName && firstName === token);
    });
    return isMention ? (
      <strong key={index} className="text-brand-orange">{part}</strong>
    ) : (
      part
    );
  });
}

export function CrewChat({
  crewId,
  captainId = null,
  members = [],
  messages,
  onSeen,
}: {
  crewId: string;
  captainId?: string | null;
  members?: ChatMember[];
  /** Messages, owned by the parent — it subscribes so the badge stays live on every tab. */
  messages: CrewChatMessage[];
  /** Called whenever the open chat is marked seen, so the parent clears the badge at once. */
  onSeen?: () => void;
}) {
  const { user } = useApp();
  const currentUser = user || auth.currentUser;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const viewerIsCaptain = Boolean(captainId && currentUser?.uid && captainId === currentUser.uid);

  // Opening the chat marks it seen, and new messages while open do too.
  useEffect(() => {
    markCrewChatSeen(crewId);
    onSeen?.();
  }, [crewId, messages.length, onSeen]);

  // Keep the newest message in view when the user is already at the bottom.
  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const handleSend = async () => {
    if (!currentUser || busy) return;
    const text = draft.trim();
    if (text.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await sendCrewChatMessage(crewId, text);
      setDraft('');
      stickToBottomRef.current = true;
    } catch (err: any) {
      setError(err?.message === 'MESSAGE_TOO_LONG' ? 'That message is too long — keep it under 1,000 characters.' : 'The message did not send. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (message: CrewChatMessage) => {
    if (!currentUser) return;
    if (message.authorId !== currentUser.uid && !viewerIsCaptain) return;
    try {
      await deleteCrewChatMessage(crewId, message.id);
    } catch (err) {
      console.error('Failed to delete chat message:', err);
    }
  };

  let lastDay = '';

  return (
    <div className="bg-white border-4 border-on-surface shadow-[8px_8px_0px_black] flex flex-col overflow-hidden">
      <div className="border-b-4 border-on-surface px-4 py-3 flex items-center gap-3 bg-brand-cyan/10">
        <MessageSquare className="w-5 h-5 text-brand-orange" />
        <div>
          <h3 className="font-display font-black uppercase italic text-xl leading-none">Crew Chat</h3>
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">@ a crewmate's name to ping them</p>
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[320px] max-h-[52vh]"
      >
        {messages.length === 0 ? (
          <p className="font-display text-2xl italic opacity-40 text-center py-12 uppercase tracking-widest leading-none">
            No messages yet. Say hi to your crew.
          </p>
        ) : (
          messages.map((message) => {
            const millis = crewChatMessageMillis(message.createdAt);
            const day = dayLabel(millis);
            const showDay = day !== lastDay;
            lastDay = day;
            const isSelf = message.authorId === currentUser?.uid;
            return (
              <React.Fragment key={message.id}>
                {showDay && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-0.5 flex-grow bg-on-surface/10" />
                    <span className="font-mono text-xs font-black uppercase tracking-widest opacity-50">{day}</span>
                    <div className="h-0.5 flex-grow bg-on-surface/10" />
                  </div>
                )}
                <div className="flex gap-2 group">
                  <div className="w-8 h-8 shrink-0 rounded-full border-2 border-on-surface bg-brand-cyan/10 flex items-center justify-center font-mono font-black text-xs text-brand-cyan-dark">
                    {message.authorName?.substring(0, 2).toUpperCase() || 'AG'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-black uppercase tracking-wider">
                      {message.authorName}
                      {message.authorId === captainId && <span className="ml-2 text-brand-orange">CAPTAIN</span>}
                      <span className="ml-2 font-normal normal-case tracking-normal text-on-surface/60">{timeLabel(millis)}</span>
                    </p>
                    <p className={`font-serif text-sm leading-relaxed break-words ${isSelf ? 'text-on-surface' : 'text-on-surface/85'}`}>
                      {renderMessageText(message.text, members)}
                    </p>
                  </div>
                  {(isSelf || viewerIsCaptain) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(message)}
                      className="shrink-0 self-start text-on-surface/60 hover:text-red-600 font-mono text-xs font-black uppercase"
                      title="Delete message"
                    >
                      ×
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="border-t-4 border-on-surface p-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            placeholder="Message your crew..."
            maxLength={MAX_CREW_CHAT_LENGTH}
            className="flex-1 min-w-0 border-2 border-on-surface px-3 py-2 font-serif text-sm bg-white placeholder:italic placeholder:text-on-surface/60"
          />
          <button
            type="button"
            disabled={busy || draft.trim().length === 0}
            onClick={handleSend}
            className="px-5 py-2 bg-brand-lime border-2 border-on-surface font-mono text-xs font-black uppercase shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-xs font-black uppercase text-red-600">{error}</p>}
      </div>
    </div>
  );
}
