/**
 * Comments on a community receipt (Nov 21, 2026 — Option C).
 *
 * Thread + composer for one entry, rendered inside the receipt detail
 * modal on CommunityProofCard. Mirrors the crew feed comments UI
 * (CrewMemoriesFeed): per-entry draft, busy/error maps, author-or-admin
 * delete. No edits: a wrong comment is deleted and re-posted.
 */
import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  addCommunityComment,
  deleteCommunityComment,
  subscribeToCommunityComments,
  type CommunityFeedComment,
} from '../services/communityFeedComments';
import { toast } from 'react-hot-toast';

function commentDateLabel(createdAt: any): string {
  const millis = typeof createdAt?.toMillis === 'function'
    ? createdAt.toMillis()
    : typeof createdAt === 'number'
      ? createdAt
      : 0;
  if (!millis) return 'Just now';
  return new Date(millis).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CommunityReceiptComments({ entryId }: { entryId: string }) {
  const { user, isAdmin } = useApp();
  const [comments, setComments] = useState<CommunityFeedComment[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setComments([]);
    setLoadFailed(false);
    if (!entryId) return;
    // A failed listen (for example, before the new rules are published)
    // reports through onError, so the thread can say so instead of
    // looking empty. Posting still works: writes go through the server,
    // not the rules.
    return subscribeToCommunityComments(
      entryId,
      (next) => {
        setComments(next);
        setLoadFailed(false);
      },
      () => setLoadFailed(true),
    );
  }, [entryId]);

  const handlePost = async () => {
    if (!user || busy) return;
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      await addCommunityComment(entryId, text);
      setDraft('');
    } catch (err: any) {
      const code = String(err?.message || '');
      setError(
        code === 'COMMENT_TOO_LONG'
          ? 'That comment is too long — keep it under 500 characters.'
          : code === 'ENTRY_OUTSIDE_SOCIAL_SCOPE'
            ? 'You can’t comment on this receipt.'
            : 'The comment did not post. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (comment: CommunityFeedComment) => {
    if (!user) return;
    if (comment.authorId !== user.uid && !isAdmin) return;
    try {
      await deleteCommunityComment(comment.id);
      setComments((prev) => prev.filter((item) => item.id !== comment.id));
    } catch {
      toast.error('The comment did not delete. Try again.');
    }
  };

  return (
    <div className="space-y-3 border-t-2 border-on-surface/10 pt-4">
      <p className="font-mono text-xs font-black uppercase tracking-widest text-on-surface">
        <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
        {comments.length === 0
          ? 'Comments'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </p>

      {loadFailed ? (
        <p className="text-xs text-on-surface/60">Couldn’t load comments.</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-on-surface/60">Be the first to comment.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border-2 border-on-surface/10 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-widest text-on-surface">
                  {comment.authorName}
                </span>
                <span className="font-mono text-xs text-on-surface/60">{commentDateLabel(comment.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-on-surface">{comment.text}</p>
              {user && (comment.authorId === user.uid || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(comment)}
                  className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-black uppercase tracking-widest text-on-surface/60 hover:text-error"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Say something about this receipt…"
            className="w-full rounded-lg border-2 border-on-surface bg-white p-3 text-xs text-on-surface placeholder:text-on-surface/60"
          />
          {error && (
            <p className="font-mono text-xs text-error" role="status">{error}</p>
          )}
          <button
            type="button"
            onClick={handlePost}
            disabled={busy || !draft.trim()}
 className="w-full rounded-lg border-2 border-on-surface bg-white px-3 py-2 font-mono text-xs font-black uppercase tracking-widest text-on-surface shadow-[2px_2px_0px_black] transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-on-surface/60">Sign in to comment.</p>
      )}
    </div>
  );
}
