import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoiceAudioPlayerProps {
  src: string;
}

export default function VoiceAudioPlayer({ src }: VoiceAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Generate a random stable key-based sequence (waveform) for aesthetics
  const [bars] = useState(() => {
    return Array.from({ length: 28 }, () => Math.floor(Math.random() * 80) + 20);
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // If metadata was already loaded
    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="p-3 bg-[#0E121A]/95 border border-slate-800/60 rounded-xl w-[285px] max-w-full font-sans select-none flex flex-col gap-2 relative overflow-hidden transition-all duration-300 hover:border-sky-500/30">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* Decorative ambient background blur */}
      <div className={`absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />

      {/* Top Header of Player */}
      <div className="flex items-center justify-between text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest leading-none z-10">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'} shrink-0`} />
          {isPlaying ? 'Streaming Audio Node' : 'Voice Payload Decrypted'}
        </span>
        <span className="text-slate-500">E2EE Stream</span>
      </div>

      {/* Central control + seek & waveform HUD */}
      <div className="flex items-center gap-3 mt-1.5">
        <button
          onClick={togglePlay}
          type="button"
          className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-450 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_8px_rgba(14,165,233,0.3)] active:scale-95 shrink-0"
        >
          {isPlaying ? <Pause size={14} className="fill-slate-950" /> : <Play size={14} className="fill-slate-950 translate-x-0.5" />}
        </button>

        {/* Waveform Visualization Bars */}
        <div className="flex-1 h-9 flex items-center gap-[2.5px] items-end pb-1 overflow-hidden select-none">
          {bars.map((height, i) => {
            const barProgress = (i / bars.length) * 100;
            const isPlayed = progressPercent >= barProgress;
            
            // Generate some live dynamics if playing to make it super premium!
            let dynamicHeight = height;
            if (isPlaying) {
              // Add simple wave oscillation
              const sinVal = Math.sin((currentTime * 5) + (i * 0.4));
              dynamicHeight = Math.max(15, Math.min(100, height + (sinVal * 15)));
            }

            return (
              <div
                key={i}
                style={{ height: `${dynamicHeight}%` }}
                className={`w-[4px] rounded-full transition-all duration-150 ${
                  isPlayed 
                    ? 'bg-sky-400 opacity-90' 
                    : 'bg-slate-700/60 opacity-40'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Slider / Timeline Track */}
      <div className="relative group/track flex items-center h-2.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-1 opacity-100 accent-sky-500 bg-slate-800/65 rounded-lg appearance-none cursor-pointer outline-none transition-all group-hover/track:h-1.5"
          style={{
            background: `linear-gradient(to right, rgb(14, 165, 233) ${progressPercent}%, rgba(30, 41, 59, 0.4) ${progressPercent}%)`
          }}
        />
      </div>

      {/* Footer Meta */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-450 text-slate-400 mt-0.5 leading-none z-10">
        <span className="font-bold tracking-tight">
          {formatTime(currentTime)} <span className="text-slate-600">/</span> {formatTime(duration)}
        </span>
        <button
          type="button"
          onClick={toggleMute}
          className="text-slate-500 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX size={12} className="text-rose-400" /> : <Volume2 size={12} />}
        </button>
      </div>
    </div>
  );
}
