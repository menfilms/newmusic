import { useState, useRef, useEffect, useCallback } from 'react';

// Types
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  audioUrl: string;
  duration: string;
  releaseDate: string;
  type: 'single' | 'album' | 'release';
}

// Default tracks
const defaultTracks: Track[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Artist',
    album: 'Nocturnal Vibes',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '5:32',
    releaseDate: '2024-01-15',
    type: 'album'
  },
  {
    id: '2',
    title: 'Electric Pulse',
    artist: 'Artist',
    album: 'Electric Pulse',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '3:45',
    releaseDate: '2024-03-20',
    type: 'single'
  },
  {
    id: '3',
    title: 'Ocean Waves',
    artist: 'Artist',
    album: 'Serenity',
    cover: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '4:18',
    releaseDate: '2024-05-10',
    type: 'release'
  },
  {
    id: '4',
    title: 'Neon Lights',
    artist: 'Artist',
    album: 'City Nights',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: '4:02',
    releaseDate: '2024-06-01',
    type: 'album'
  },
  {
    id: '5',
    title: 'Starfall',
    artist: 'Artist',
    album: 'Cosmos',
    cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: '6:11',
    releaseDate: '2024-07-22',
    type: 'single'
  },
  {
    id: '6',
    title: 'Golden Hour',
    artist: 'Artist',
    album: 'Sunset Sessions',
    cover: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: '3:58',
    releaseDate: '2024-08-15',
    type: 'release'
  }
];

// Helper functions
function getTracks(): Track[] {
  const stored = localStorage.getItem('musichub_tracks');
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem('musichub_tracks', JSON.stringify(defaultTracks));
  return defaultTracks;
}

function saveTracks(tracks: Track[]) {
  localStorage.setItem('musichub_tracks', JSON.stringify(tracks));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Audio Visualizer Component
function AudioVisualizer({ isPlaying, audioRef }: { isPlaying: boolean; audioRef: React.RefObject<HTMLAudioElement> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (!analyserRef.current) {
        // Draw idle animation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const time = Date.now() / 1000;
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#06b6d4');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let i = 0; i < canvas.width; i++) {
          const y = canvas.height / 2 + Math.sin(i / 30 + time * 2) * 20 * (isPlaying ? 1 : 0.2);
          ctx.lineTo(i, y);
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.stroke();
        return;
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const hue = (i / bufferLength) * 60 + 250;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, [audioRef]);

  useEffect(() => {
    if (isPlaying) {
      initAudioContext();
    }
  }, [isPlaying, initAudioContext]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20 rounded-xl opacity-70"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Player Component
function Player({
  currentTrack,
  isPlaying,
  setIsPlaying,
  setCurrentTrack,
  tracks
}: {
  currentTrack: Track | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  setCurrentTrack: (t: Track | null) => void;
  tracks: Track[];
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playNext = () => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * tracks.length);
      setCurrentTrack(tracks[randomIdx]);
    } else {
      const nextIdx = (idx + 1) % tracks.length;
      setCurrentTrack(tracks[nextIdx]);
    }
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const prevIdx = (idx - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prevIdx]);
    setIsPlaying(true);
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' || tracks.findIndex(t => t.id === currentTrack?.id) < tracks.length - 1) {
      playNext();
    } else {
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (!currentTrack) return;
    const a = document.createElement('a');
    a.href = currentTrack.audioUrl;
    a.download = `${currentTrack.artist} - ${currentTrack.title}.mp3`;
    a.target = '_blank';
    a.click();
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      {/* Progress bar */}
      <div className="px-4 pt-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:hover:bg-purple-400 [&::-webkit-slider-thumb]:transition-colors"
          style={{
            background: `linear-gradient(to right, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, #374151 ${(currentTime / (duration || 1)) * 100}%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        {/* Track info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover shadow-lg"
          />
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{currentTrack.title}</p>
            <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-full transition-colors ${isShuffle ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>
          <button onClick={playPrev} className="p-2 text-gray-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-all hover:scale-105 shadow-lg shadow-purple-600/30"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button onClick={playNext} className="p-2 text-gray-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
          <button
            onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
            className={`p-2 rounded-full transition-colors relative ${repeatMode !== 'none' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold text-purple-400">1</span>
            )}
          </button>
        </div>

        {/* Volume & Download */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
            title="Скачать трек"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
            className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            style={{
              background: `linear-gradient(to right, #8b5cf6 ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Admin Panel Component
function AdminPanel({
  tracks,
  setTracks,
  onClose
}: {
  tracks: Track[];
  setTracks: (t: Track[]) => void;
  onClose: () => void;
}) {
  const [newTrack, setNewTrack] = useState<Partial<Track>>({
    title: '',
    artist: 'Artist',
    album: '',
    cover: '',
    audioUrl: '',
    duration: '',
    releaseDate: new Date().toISOString().split('T')[0],
    type: 'single'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const handleAdd = () => {
    if (!newTrack.title || !newTrack.audioUrl) return;
    
    if (editingId) {
      const updated = tracks.map(t => t.id === editingId ? { ...t, ...newTrack } as Track : t);
      setTracks(updated);
      saveTracks(updated);
      setEditingId(null);
    } else {
      const track: Track = {
        id: generateId(),
        title: newTrack.title || '',
        artist: newTrack.artist || 'Artist',
        album: newTrack.album || '',
        cover: newTrack.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
        audioUrl: newTrack.audioUrl || '',
        duration: newTrack.duration || '0:00',
        releaseDate: newTrack.releaseDate || new Date().toISOString().split('T')[0],
        type: (newTrack.type as 'single' | 'album' | 'release') || 'single'
      };
      const updated = [...tracks, track];
      setTracks(updated);
      saveTracks(updated);
    }
    setNewTrack({
      title: '',
      artist: 'Artist',
      album: '',
      cover: '',
      audioUrl: '',
      duration: '',
      releaseDate: new Date().toISOString().split('T')[0],
      type: 'single'
    });
  };

  const handleEdit = (track: Track) => {
    setNewTrack(track);
    setEditingId(track.id);
  };

  const handleDelete = (id: string) => {
    const updated = tracks.filter(t => t.id !== id);
    setTracks(updated);
    saveTracks(updated);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewTrack({
      title: '',
      artist: 'Artist',
      album: '',
      cover: '',
      audioUrl: '',
      duration: '',
      releaseDate: new Date().toISOString().split('T')[0],
      type: 'single'
    });
  };

  const filteredTracks = filter === 'all' ? tracks : tracks.filter(t => t.type === filter);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700/50 shadow-2xl">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">🎛️ Админ-панель</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Add/Edit Form */}
          <div className="bg-gray-800/50 rounded-xl p-5 mb-6 border border-gray-700/30">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? '✏️ Редактировать трек' : '➕ Добавить новый трек'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Название *</label>
                <input
                  type="text"
                  value={newTrack.title || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Название трека"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Артист</label>
                <input
                  type="text"
                  value={newTrack.artist || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Имя артиста"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Альбом</label>
                <input
                  type="text"
                  value={newTrack.album || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, album: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Название альбома"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Тип</label>
                <select
                  value={newTrack.type || 'single'}
                  onChange={(e) => setNewTrack({ ...newTrack, type: e.target.value as 'single' | 'album' | 'release' })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="single">Сингл</option>
                  <option value="album">Альбом</option>
                  <option value="release">Релиз</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">URL аудиофайла *</label>
                <input
                  type="text"
                  value={newTrack.audioUrl || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, audioUrl: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="https://example.com/track.mp3"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">URL обложки</label>
                <input
                  type="text"
                  value={newTrack.cover || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, cover: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Длительность</label>
                <input
                  type="text"
                  value={newTrack.duration || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="3:45"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Дата релиза</label>
                <input
                  type="date"
                  value={newTrack.releaseDate || ''}
                  onChange={(e) => setNewTrack({ ...newTrack, releaseDate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
              >
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
              )}
            </div>
          </div>

          {/* Track list */}
          <div className="flex gap-2 mb-4">
            {['all', 'single', 'album', 'release'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'single' ? 'Синглы' : f === 'album' ? 'Альбомы' : 'Релизы'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredTracks.map(track => (
              <div
                key={track.id}
                className="flex items-center gap-4 bg-gray-800/30 rounded-lg p-3 border border-gray-700/20 hover:border-gray-600/50 transition-colors"
              >
                <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{track.title}</p>
                  <p className="text-gray-400 text-sm truncate">{track.artist} • {track.album}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  track.type === 'single' ? 'bg-blue-500/20 text-blue-400' :
                  track.type === 'album' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {track.type === 'single' ? 'Сингл' : track.type === 'album' ? 'Альбом' : 'Релиз'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(track)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(track.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [tracks, setTracks] = useState<Track[]>(getTracks());
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const filteredTracks = tracks.filter(track => {
    const matchesFilter = filter === 'all' || track.type === filter;
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.album.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdminAuth(true);
      setShowAdmin(true);
    }
  };

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleDownload = (track: Track) => {
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.artist} - ${track.title}.mp3`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              MusicHub
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск треков..."
                className="bg-gray-800/50 border border-gray-700/50 rounded-full px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors w-64"
              />
              <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <button
              onClick={() => {
                if (isAdminAuth) {
                  setShowAdmin(true);
                } else {
                  setShowAdmin(true);
                }
              }}
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <span className="hidden sm:inline">Админ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-cyan-600/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Моя Музыка
              </span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
              Слушайте мои треки, альбомы и синглы. Наслаждайтесь каждым звуком.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Все' },
              { key: 'album', label: '🎵 Альбомы' },
              { key: 'single', label: '💿 Синглы' },
              { key: 'release', label: '🔥 Релизы' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative md:hidden flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-full px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
            />
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Track Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map(track => (
            <div
              key={track.id}
              className={`group relative bg-gray-800/30 rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 ${
                currentTrack?.id === track.id ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={track.cover}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => playTrack(track)}
                    className="w-14 h-14 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center shadow-xl shadow-purple-600/40 transition-all hover:scale-110"
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1">
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                      <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                      <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                      <div className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '80%', animationDelay: '450ms' }} />
                    </div>
                    <span className="text-xs text-purple-300 ml-1">Играет</span>
                  </div>
                )}
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                  track.type === 'single' ? 'bg-blue-500/80 text-white' :
                  track.type === 'album' ? 'bg-green-500/80 text-white' :
                  'bg-orange-500/80 text-white'
                }`}>
                  {track.type === 'single' ? 'Сингл' : track.type === 'album' ? 'Альбом' : 'Релиз'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold truncate">{track.title}</h3>
                <p className="text-gray-400 text-sm truncate mt-1">{track.artist} • {track.album}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-gray-500 text-xs">{track.duration} • {track.releaseDate}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(track)}
                      className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-700/50"
                      title="Скачать"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => playTrack(track)}
                      className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-700/50"
                      title="Играть"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTracks.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-gray-400 text-lg">Треки не найдены</p>
            <p className="text-gray-500 text-sm mt-2">Попробуйте изменить фильтры или поисковый запрос</p>
          </div>
        )}
      </section>

      {/* Admin Login Modal */}
      {showAdmin && !isAdminAuth && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-8 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Вход в админ-панель</h3>
              <p className="text-gray-400 text-sm mt-2">Введите пароль для доступа</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Пароль"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-purple-600/30"
              >
                Войти
              </button>
              <button
                onClick={() => { setShowAdmin(false); setAdminPassword(''); }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
              >
                Отмена
              </button>
              <p className="text-center text-gray-500 text-xs">Пароль по умолчанию: admin123</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && isAdminAuth && (
        <AdminPanel
          tracks={tracks}
          setTracks={setTracks}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* Player */}
      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        setCurrentTrack={setCurrentTrack}
        tracks={tracks}
      />

      {/* Hidden audio ref for visualizer */}
      <audio ref={audioRef} />
    </div>
  );
}
