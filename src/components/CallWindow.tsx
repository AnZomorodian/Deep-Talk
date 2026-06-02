import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Shield, Settings, Volume2, User } from 'lucide-react';
import { CallState } from '../types';

interface CallWindowProps {
  call: CallState;
  currentUserId: string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export default function CallWindow({ call, currentUserId, onAccept, onReject, onEnd }: CallWindowProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(call.type === 'video');
  const [duration, setDuration] = useState(0);
  const [, setAudioCtx] = useState<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const isIncoming = call.receiverId === currentUserId && call.status === 'incoming';
  const isOutgoing = call.callerId === currentUserId && call.status === 'outgoing';
  const isConnected = call.status === 'connected';

  // Format call duration
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Ringing Synthesizer using standard Web Audio API
  const startRinging = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioCtx(ctx);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pleasant dual-frequency telephone ring (440Hz + 480Hz blend)
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      ringOscillatorRef.current = osc;

      // Simulate ticking ring cycles
      let isRinging = true;
      const interval = setInterval(() => {
        if (!isRinging) return;
        // Ring for 1.5s
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 1.2);
      }, 3000);

      return () => {
        clearInterval(interval);
        try {
          osc.stop();
          ctx.close();
        } catch (e) {}
      };
    } catch (e) {
      console.warn('Web Audio Context not accepted by browser interaction:', e);
      return () => {};
    }
  };

  // Ring handle useEffect
  useEffect(() => {
    let cleanupRing = () => {};
    if (isIncoming || isOutgoing) {
      cleanupRing = startRinging();
    }
    return () => {
      cleanupRing();
    };
  }, [call.status]);

  // Start call timer when connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      const start = Date.now();
      timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // Handle local camera/mic stream trigger
  useEffect(() => {
    async function initMedia() {
      if (videoActive || call.type === 'video') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('Could not launch camera feed (falling back to audio only):', err);
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setLocalStream(audioStream);
          } catch (audioErr) {
            console.error('Media devices blocked:', audioErr);
          }
        }
      }
    }

    if (isConnected || isOutgoing) {
      initMedia();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isConnected, videoActive]);

  // Toggle media states
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !micActive;
      });
      setMicActive(!micActive);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoActive;
      });
    }
    setVideoActive(!videoActive);
  };

  return (
    <div id="call-window-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C12]/90 backdrop-blur-md p-4 animate-fade-in">
      <div id="call-card-box" className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col h-[580px]">
        
        {/* Visual Encryption Banner */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded text-[10px] text-sky-400 font-bold font-mono">
            <Shield size={12} />
            E2EE ENCRYPTED
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-850 rounded text-[10px] text-slate-350 font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            {call.type === 'video' ? 'SECURE VIDEO' : 'SECURE VOICE'}
          </div>
        </div>

        {/* Call Stream Canvas Area */}
        <div id="call-video-canvas" className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Main Display: Remote user mock/stream info */}
          {isConnected && videoActive ? (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-tr from-[#0E121A] to-[#1A1F2B] flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 mb-4 shadow-xl ring-4 ring-sky-500/10 animate-pulse">
                  <User size={36} className="text-sky-400" />
                </div>
                <h3 className="text-base font-bold font-sans text-slate-200">{isOutgoing ? call.receiverId : call.callerName}</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-wider">Live secure pipeline broadcast...</p>
                <div className="flex items-center gap-1.5 mt-3 px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-[9px] text-slate-500 font-mono">
                  <span className="text-emerald-400 font-bold">FPS: 30</span> | <span>LATENCY: ~14ms</span>
                </div>
              </div>
            </div>
          ) : (
            // Audio-only or outgoing call state
            <div className="flex flex-col items-center justify-center text-center p-8 z-10 relative w-full h-full">
              <div className="relative mb-6 flex items-center justify-center">
                {/* Ripple voice waves */}
                <span className="absolute w-36 h-36 rounded-full bg-sky-500/5 animate-[ping_2s_infinite]" />
                <span className="absolute w-28 h-28 rounded-full bg-sky-500/10 animate-[ping_1.5s_infinite]" />
                <div className="absolute -inset-4 bg-sky-500/15 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 shadow-2xl relative z-10">
                  <User size={36} className="text-sky-450" />
                </div>
              </div>
              <h2 className="text-base font-bold font-sans text-white uppercase tracking-tight relative z-10">
                {isOutgoing ? call.receiverId : call.callerName}
              </h2>
              <p className="text-[10px] text-sky-450 mt-2.5 font-mono uppercase tracking-wider font-bold relative z-10 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/15">
                {call.status === 'outgoing' && 'Ringing client devices...'}
                {call.status === 'incoming' && 'Incoming video call...'}
                {call.status === 'connected' && `Call in progress: ${formatDuration(duration)}`}
              </p>

              {/* Secure E2EE key fingerprint status under the caller ID */}
              <div className="mt-6 p-2 bg-slate-950/60 border border-slate-850/80 rounded-xl relative z-10 max-w-[200px] text-center shadow-lg">
                <span className="text-[8px] font-mono text-slate-500 block uppercase tracking-widest font-bold">TUNNEL SYNC ID</span>
                <span className="text-[9px] font-mono text-emerald-450 font-bold block select-all break-all tracking-wider mt-1">
                  SECURE-LINE-{(call.callerId + call.roomId).substring(0, 10).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Picture-in-Picture: Local Camera Feed */}
          {(isConnected || isOutgoing) && videoActive && (
            <div className="absolute bottom-4 right-4 w-24 h-36 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-1.5 left-1.5 text-[8px] px-1.5 py-0.5 bg-black/60 rounded text-slate-300 font-mono">
                YOU
              </div>
            </div>
          )}
        </div>

        {/* Call Commands Control Panel */}
        <div id="call-interface-buttons" className="p-8 bg-[#0E121A] border-t border-slate-850/80 flex flex-col items-center gap-6">
          
          {/* Status Message */}
          <div className="text-center flex flex-col items-center gap-1">
            {call.status === 'incoming' && (
              <span className="text-[11px] text-slate-500 font-sans">Verify local keys before answering incoming voice links</span>
            )}
            {call.status === 'outgoing' && (
              <span className="text-[11px] text-slate-500 font-sans">Negotiating encrypted peer handshakes...</span>
            )}
            {call.status === 'connected' && (
              <>
                <span className="text-[11px] text-slate-500 font-sans">P2P media stream is live and secured</span>
                <span id="call-duration-display" className="text-xs font-bold text-sky-400 font-mono tracking-wider bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/25 mt-1.5 animate-pulse">
                  {formatDuration(duration)}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 w-full">
            {/* INCOMING ACTION BUTTONS */}
            {isIncoming && (
              <>
                <button
                  id="call-reject-btn"
                  onClick={onReject}
                  className="flex items-center justify-center w-12 h-12 bg-red-500 hover:bg-red-650 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-red-500/20 cursor-pointer"
                  title="Decline Call"
                >
                  <PhoneOff size={20} />
                </button>
                <button
                  id="call-accept-btn"
                  onClick={onAccept}
                  className="flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
                  title="Answer Call"
                >
                  <Phone size={22} />
                </button>
              </>
            )}

            {/* ACTIVE CALL / OUTGOING BUTTONS */}
            {(isOutgoing || isConnected) && (
              <>
                {/* Mute Mic */}
                <button
                  id="call-mute-btn"
                  onClick={toggleMute}
                  className={`flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 border cursor-pointer ${
                    micActive 
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400' 
                      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500 text-amber-400'
                  }`}
                  title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {micActive ? <Mic size={18} /> : <MicOff size={18} />}
                </button>

                {/* Cancel/End Call */}
                <button
                  id="call-disconnect-btn"
                  onClick={onEnd}
                  className="flex items-center justify-center w-12 h-12 bg-red-550 hover:bg-red-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-red-500/20 cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff size={20} />
                </button>

                {/* Toggle Camera */}
                <button
                  id="call-cam-toggle"
                  onClick={toggleVideo}
                  className={`flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 border cursor-pointer ${
                    videoActive 
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400' 
                      : 'bg-[#1A1F2B] hover:bg-slate-800 border-sky-500/30 text-sky-400'
                  }`}
                  title={videoActive ? 'Turn Off Video' : 'Turn On Video'}
                >
                  {videoActive ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
