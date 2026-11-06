import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, RotateCcw, Play } from 'lucide-react';
import { MIN_VOICE_NOTE_SECONDS } from '../logic/missionScoring';

export interface VoiceNoteValue {
  dataUrl: string;
  durationSec: number;
  mimeType: string;
}

interface VoiceNoteRecorderProps {
  value: VoiceNoteValue | null | undefined;
  onChange: (value: VoiceNoteValue | null) => void;
  prompt?: string;
  frankieMode?: boolean;
}

/**
 * A one-tap voice note recorder for the noting step. Tap to talk, tap to
 * stop. A note only counts once it is at least MIN_VOICE_NOTE_SECONDS
 * long — shorter takes are sent back for another try, never stored.
 */
export function VoiceNoteRecorder({ value, onChange, prompt, frankieMode }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks();
        const elapsed = secondsRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (elapsed < MIN_VOICE_NOTE_SECONDS) {
          setError(`Too short — give it at least ${MIN_VOICE_NOTE_SECONDS} seconds.`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || '');
          if (!dataUrl) {
            setError('That recording did not save. Try again.');
            return;
          }
          const url = URL.createObjectURL(blob);
          setPlaybackUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          onChange({ dataUrl, durationSec: elapsed, mimeType: blob.type || 'audio/webm' });
        };
        reader.readAsDataURL(blob);
      };
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      recorder.start();
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch (err) {
      setError('Microphone blocked. Allow mic access to record a voice note.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const clearRecording = () => {
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }
    setError(null);
    onChange(null);
  };

  return (
    <div className="rounded-xl border-2 border-on-surface bg-[#FAF9F6] p-4">
      <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/50">
        {frankieMode ? 'Or say it instead' : 'Voice note instead'}
      </p>
      {prompt && (
        <p className="mt-1 font-serif italic text-base leading-snug text-on-surface/70">{prompt}</p>
      )}

      {value && !recording ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-brand-lime">
            <Play size={14} /> Voice note saved — {value.durationSec}s
          </div>
          {playbackUrl && (
            <audio controls src={playbackUrl} className="w-full" />
          )}
          <button
            type="button"
            onClick={clearRecording}
            className="flex items-center gap-1.5 rounded-full border-2 border-on-surface bg-white px-3 py-1.5 font-sans text-xs font-bold transition-all hover:bg-brand-lime/30"
          >
            <RotateCcw size={13} /> Record again
          </button>
        </div>
      ) : recording ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="font-display text-2xl font-black italic tabular-nums">{seconds}s</span>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-full border-2 border-on-surface bg-brand-orange px-4 py-2 font-sans text-sm font-bold text-white transition-all hover:scale-[1.02]"
          >
            <Square size={14} /> Stop
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="mt-3 flex min-h-11 items-center gap-2 rounded-full border-2 border-on-surface bg-white px-4 py-2 font-sans text-sm font-bold transition-all hover:bg-brand-lime/30"
        >
          <Mic size={16} /> Tap to talk
        </button>
      )}

      {error && (
        <p className="mt-2 font-sans text-xs font-bold text-red-600">{error}</p>
      )}
      {!value && !recording && !error && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-on-surface/45">
          At least {MIN_VOICE_NOTE_SECONDS} seconds — it counts as your field note.
        </p>
      )}
    </div>
  );
}
