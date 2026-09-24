import { useState, useRef, useEffect, useCallback } from 'react';

// ============ TYPES ============
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

// ============ CONFIG ============
const ADMIN_PASSWORD = 'admin123';
const STORAGE_KEY = 'musichub_tracks';
const AUTH_KEY = 'musichub_admin';

// ============ DEFAULT TRACKS ============
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

// ============ HELPERS ============
function loadTracks(): Track[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTracks));
  return defaultTracks;
}

function saveTracks(tracks: Track[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============ MAIN APP ============
export default function App() {
  const [tracks, setTracks] = useState<Track[]>(loadTracks);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [password, setPassword] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('Artist');
  const [formAlbum, setFormAlbum] = useState('');
  const [formType, setFormType] = useState<'single' | 'album' | 'release'>('single');
  const [formDuration, setFormDuration] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAudioUrl, setFormAudioUrl] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);

  // Show toast
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Audio effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack) {
      audio.src = currentTrack.audioUrl;
      if (isPlaying) audio.play().catch(() => {});
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Filtered tracks
  const filteredTracks = tracks.filter(track => {
    const matchesFilter = filter === 'all' || track.type === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Player functions
  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const next = (idx + 1) % tracks.length;
    setCurrentTrack(tracks[next]);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (!currentTrack) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const prev = (idx - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prev]);
    setIsPlaying(true);
  };

  const downloadTrack = (track: Track) => {
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.artist} - ${track.title}.mp3`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  // Admin functions
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setShowLogin(false);
      setShowAdmin(true);
      setPassword('');
      showToast('Вход выполнен!');
    } else {
      showToast('Неверный пароль', 'error');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem(AUTH_KEY);
    setShowAdmin(false);
    showToast('Вы вышли из системы');
  };

  const resetForm = () => {
    setEditingTrack(null);
    setFormTitle('');
    setFormArtist('Artist');
    setFormAlbum('');
    setFormType('single');
    setFormDuration('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAudioUrl('');
    setFormCoverUrl('');
  };

  const handleSubmitTrack = () => {
    if (!formTitle.trim()) { showToast('Введите название', 'error'); return; }
    if (!formAudioUrl.trim()) { showToast('Укажите URL аудио', 'error'); return; }

    if (editingTrack) {
      const updated = tracks.map(t => t.id === editingTrack.id ? {
        ...t,
        title: formTitle.trim(),
        artist: formArtist.trim() || 'Artist',
        album: formAlbum.trim(),
        type: formType,
        duration: formDuration || '0:00',
        releaseDate: formDate,
        audioUrl: formAudioUrl.trim(),
        cover: formCoverUrl.trim() || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
      } : t);
      setTracks(updated);
      saveTracks(updated);
      showToast('Трек обновлён!');
    } else {
      const newTrack: Track = {
        id: generateId(),
        title: formTitle.trim(),
        artist: formArtist.trim() || 'Artist',
        album: formAlbum.trim(),
        type: formType,
        duration: formDuration || '0:00',
        releaseDate: formDate,
        audioUrl: formAudioUrl.trim(),
        cover: formCoverUrl.trim() || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
      };
      const updated = [newTrack, ...tracks];
      setTracks(updated);
      saveTracks(updated);
      showToast('Трек добавлен!');
    }
    resetForm();
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
    setFormTitle(track.title);
    setFormArtist(track.artist);
    setFormAlbum(track.album);
    setFormType(track.type);
    setFormDuration(track.duration);
    setFormDate(track.releaseDate);
    setFormAudioUrl(track.audioUrl);
    setFormCoverUrl(track.cover);
  };

  const handleDeleteTrack = (id: string) => {
    if (!confirm('Удалить этот трек?')) return;
    const updated = tracks.filter(t => t.id !== id);
    setTracks(updated);
    saveTracks(updated);
    showToast('Трек удалён');
  };

  const openAdmin = () => {
    if (isAdmin) {
      setShowAdmin(true);
    } else {
      setShowLogin(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }
        @keyframes eq { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
        @keyframes slideIn { from{transform:translateX(120%)} to{transform:translateX(0)} }
        input, select, button { font-family: inherit; }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139,92,246,0.15)'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(139,92,246,0.3)'
            }}>
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MusicHub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }} className="hidden md:block">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск треков..."
                style={{
                  background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: 50, padding: '10px 16px 10px 40px', color: 'white', fontSize: 14, width: 260
                }}
              />
            </div>
            <button onClick={openAdmin} style={{
              padding: '10px 20px', borderRadius: 50, fontSize: 14, fontWeight: 500,
              background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(139,92,246,0.15)',
              color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
              <span>Админ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', borderRadius: '50%', animation: 'float 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '20%', right: '15%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(6,182,212,0.1), transparent 70%)', borderRadius: '50%', animation: 'float 6s ease-in-out infinite reverse' }} />
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #ec4899, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16, position: 'relative', zIndex: 1 }}>Моя Музыка</h1>
        <p style={{ color: '#9ca3af', fontSize: 18, maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>Слушайте мои треки, альбомы и синглы. Наслаждайтесь каждым звуком 🎧</p>
      </section>

      {/* Mobile Search */}
      <div style={{ padding: '0 24px 16px' }} className="md:hidden">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск треков..."
          style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }}
        />
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 32px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { key: 'all', label: 'Все' },
          { key: 'album', label: '🎵 Альбомы' },
          { key: 'single', label: '💿 Синглы' },
          { key: 'release', label: '🔥 Релизы' }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '8px 18px', borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: filter === f.key ? '1px solid #8b5cf6' : '1px solid rgba(139,92,246,0.15)',
            background: filter === f.key ? '#8b5cf6' : 'rgba(26,26,46,0.4)',
            color: filter === f.key ? 'white' : '#9ca3af',
            boxShadow: filter === f.key ? '0 4px 12px rgba(139,92,246,0.3)' : 'none',
            transition: 'all 0.3s'
          }}>{f.label}</button>
        ))}
      </div>

      {/* Tracks Grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 120px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {filteredTracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎵</div>
            <h3 style={{ fontSize: 20, color: '#9ca3af' }}>Треки не найдены</h3>
            <p style={{ color: '#6b7280', marginTop: 8 }}>Попробуйте изменить фильтры</p>
          </div>
        )}
        {filteredTracks.map(track => {
          const isCurrent = currentTrack?.id === track.id;
          const badgeColor = track.type === 'single' ? 'rgba(59,130,246,0.8)' : track.type === 'album' ? 'rgba(34,197,94,0.8)' : 'rgba(249,115,22,0.8)';
          const typeLabel = track.type === 'single' ? 'Сингл' : track.type === 'album' ? 'Альбом' : 'Релиз';

          return (
            <div key={track.id} style={{
              background: '#1a1a2e', borderRadius: 16, overflow: 'hidden',
              border: isCurrent ? '1px solid #8b5cf6' : '1px solid rgba(139,92,246,0.15)',
              transition: 'all 0.3s', cursor: 'pointer',
              boxShadow: isCurrent ? '0 0 30px rgba(139,92,246,0.2)' : 'none'
            }}
            className="track-card">
              <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                <img src={track.cover} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="track-img" />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.3s' }} className="track-overlay">
                  <button onClick={() => playTrack(track)} style={{
                    width: 56, height: 56, background: '#8b5cf6', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(139,92,246,0.5)'
                  }}>
                    {isCurrent && isPlaying
                      ? <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    }
                  </button>
                </div>
                <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: badgeColor, color: 'white', backdropFilter: 'blur(10px)' }}>{typeLabel}</span>
                {isCurrent && isPlaying && (
                  <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
                    {[0, 150, 300, 450].map((delay, i) => (
                      <span key={i} style={{ width: 3, background: '#a78bfa', borderRadius: 2, animation: `eq 0.8s ease-in-out infinite ${delay}ms`, height: [60, 100, 40, 80][i] + '%' }} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist} • {track.album}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{track.duration} • {track.releaseDate}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => downloadTrack(track)} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                    <button onClick={() => playTrack(track)} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player */}
      {currentTrack && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(139,92,246,0.15)'
        }}>
          {/* Progress */}
          <div style={{ padding: '8px 24px 0' }}>
            <div onClick={seekAudio} style={{ width: '100%', height: 4, background: 'rgba(75,85,99,0.5)', borderRadius: 2, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: 2, width: `${(currentTime / (duration || 1)) * 100}%`, transition: 'width 0.1s linear' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px 16px', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <img src={currentTrack.cover} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.artist}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={playPrev} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#8b5cf6', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(139,92,246,0.4)' }}>
                {isPlaying
                  ? <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button onClick={playNext} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button onClick={() => downloadTrack(currentTrack)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              <button onClick={() => setIsMuted(!isMuted)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  {isMuted ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>}
                </svg>
              </button>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                style={{ width: 80, cursor: 'pointer' }} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio */}
      <audio ref={audioRef}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={playNext}
      />

      {/* Login Modal */}
      {showLogin && (
        <div onClick={e => e.target === e.currentTarget && setShowLogin(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{ background: '#12121a', borderRadius: 20, border: '1px solid rgba(139,92,246,0.15)', width: '100%', maxWidth: 400, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>🔐 Вход в админку</h2>
              <button onClick={() => setShowLogin(false)} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Введите пароль"
                style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
            </div>
            <button onClick={handleLogin} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Войти</button>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#6b7280' }}>Пароль: admin123</p>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {showAdmin && isAdmin && (
        <div onClick={e => e.target === e.currentTarget && setShowAdmin(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto'
        }}>
          <div style={{ background: '#12121a', borderRadius: 20, border: '1px solid rgba(139,92,246,0.15)', width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎛️ Админ-панель</h2>
              <button onClick={() => setShowAdmin(false)} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {/* Form */}
              <div style={{ background: '#1a1a2e', borderRadius: 14, padding: 20, border: '1px solid rgba(139,92,246,0.15)', marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 16 }}>{editingTrack ? '✏️ Редактировать' : '➕ Добавить трек'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Название *</label>
                    <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Название" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Артист</label>
                    <input type="text" value={formArtist} onChange={e => setFormArtist(e.target.value)} placeholder="Артист" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Альбом</label>
                    <input type="text" value={formAlbum} onChange={e => setFormAlbum(e.target.value)} placeholder="Альбом" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Тип</label>
                    <select value={formType} onChange={e => setFormType(e.target.value as any)} style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }}>
                      <option value="single">Сингл</option>
                      <option value="album">Альбом</option>
                      <option value="release">Релиз</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Длительность</label>
                    <input type="text" value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="3:45" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>Дата</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>URL аудио *</label>
                  <input type="text" value={formAudioUrl} onChange={e => setFormAudioUrl(e.target.value)} placeholder="https://example.com/track.mp3" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>URL обложки</label>
                  <input type="text" value={formCoverUrl} onChange={e => setFormCoverUrl(e.target.value)} placeholder="https://example.com/cover.jpg" style={{ width: '100%', padding: '12px 16px', background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, color: 'white', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={handleSubmitTrack} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                    {editingTrack ? 'Сохранить' : 'Добавить'}
                  </button>
                  {editingTrack && (
                    <button onClick={resetForm} style={{ padding: '10px 20px', background: 'rgba(26,26,46,0.6)', border: '1px solid rgba(139,92,246,0.15)', color: '#9ca3af', borderRadius: 50, fontSize: 14, cursor: 'pointer' }}>Отмена</button>
                  )}
                  <button onClick={handleLogout} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 50, fontSize: 14, cursor: 'pointer', marginLeft: 'auto' }}>Выйти</button>
                </div>
              </div>

              {/* Track List */}
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>📋 Треки ({tracks.length})</h3>
              {tracks.map(track => (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#1a1a2e', borderRadius: 12, marginBottom: 8, border: '1px solid rgba(139,92,246,0.15)' }}>
                  <img src={track.cover} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</h4>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>{track.artist} • {track.album}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleEditTrack(track)} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button onClick={() => handleDeleteTrack(track.id)} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 400, padding: '14px 20px', borderRadius: 12,
          fontSize: 14, fontWeight: 500, animation: 'slideIn 0.3s',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: toast.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color: toast.type === 'success' ? '#4ade80' : '#f87171'
        }}>{toast.message}</div>
      )}

      {/* Hover styles */}
      <style>{`
        .track-card:hover { transform: translateY(-4px); border-color: rgba(139,92,246,0.4) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(139,92,246,0.1); }
        .track-card:hover .track-overlay { opacity: 1 !important; }
        .track-card:hover .track-img { transform: scale(1.08); }
        @media (max-width: 768px) {
          .md\\:hidden { display: none !important; }
        }
        @media (min-width: 768px) {
          .md\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
