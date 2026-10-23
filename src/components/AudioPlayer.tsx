import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speakText, stopCurrentSpeech } from '../utils/audio';

interface AudioPlayerProps {
  text: string;
  voice?: string;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, voice = 'Kore', autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (autoPlay && text) {
      handlePlay();
    }
    return () => {
      // do not cancel on simple re-render
    };
  }, [autoPlay]);

  const handlePlay = async () => {
    if (isPlaying) {
      stopCurrentSpeech();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    await speakText(
      text,
      voice,
      () => {
        setIsLoading(false);
        setIsPlaying(true);
      },
      () => {
        setIsLoading(false);
        setIsPlaying(false);
      }
    );
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
        isPlaying
          ? 'text-cyan-300 bg-cyan-500/20 ring-1 ring-cyan-500/40 animate-pulse'
          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
      }`}
      title={isPlaying ? 'Stop speaking' : 'Speak answer aloud'}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPlaying ? (
        <>
          <VolumeX className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-cyan-300 font-semibold">Stop Speaking</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5" />
          <span>Speak</span>
        </>
      )}
    </button>
  );
};
