import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  recording: boolean;
  transcribing: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

/** Large tap-to-talk control for live session voice questions. */
export function VoiceRecorder({
  transcript,
  onTranscriptChange,
  recording,
  transcribing,
  onStart,
  onStop,
  disabled,
}: VoiceRecorderProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-cream bg-brand-soft-light p-6">
      <p className="text-center text-sm text-brand-slate">
        Tap the microphone and let the client answer. We will transcribe their response.
      </p>

      <button
        type="button"
        disabled={disabled || transcribing}
        onClick={recording ? onStop : onStart}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        className={cn(
          'relative flex h-28 w-28 items-center justify-center rounded-full shadow-lg transition-all',
          recording
            ? 'bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
            : 'bg-brand-primary text-white hover:scale-105 hover:shadow-xl ring-4 ring-brand-cream',
          (disabled || transcribing) && 'pointer-events-none opacity-50',
        )}
      >
        {transcribing ? (
          <Loader2 className="h-12 w-12 animate-spin" />
        ) : recording ? (
          <MicOff className="h-12 w-12" />
        ) : (
          <Mic className="h-12 w-12" />
        )}
      </button>

      <p className="text-sm font-semibold text-brand-navy">
        {transcribing ? 'Transcribing...' : recording ? 'Recording — tap to stop' : 'Tap to record'}
      </p>

      <div className="w-full">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-brand-slate">
          Client response (transcript)
        </label>
        <Textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          rows={5}
          placeholder="Transcript appears here after recording, or type manually..."
          className="w-full border-0 bg-white ring-1 ring-brand-cream focus:ring-brand-primary/40"
        />
      </div>

      {!recording && !transcribing && (
        <Button type="button" variant="outline" size="sm" onClick={onStart} disabled={disabled}>
          <Mic className="mr-2 h-4 w-4" /> Record again
        </Button>
      )}
    </div>
  );
}
