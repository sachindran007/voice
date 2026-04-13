import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Trash2, Calendar, Clock, Edit2, Check, X, Info, FileText, List, Zap, MessageSquare } from 'lucide-react';
import { getRecording, updateRecording, deleteRecording } from '../services/api';
import { format } from 'date-fns';

const RecordingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    fetchData();
    return () => { if (audio) audio.pause(); };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecording(id);
      setRecording(data);
      setNewTitle(data.title);
    } catch (err) {
      console.error('Fetch detail failed:', err);
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async () => {
    try {
      await updateRecording(id, { title: newTitle });
      setRecording({ ...recording, title: newTitle });
      setEditingTitle(false);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      try {
        await deleteRecording(id);
        navigate('/history');
      } catch (err) { console.error(err); }
    }
  };

  const togglePlayback = () => {
    if (!recording?.chunks?.length) return;
    
    // Simplification: Play the first chunk found
    const firstValidChunk = recording.chunks.find(c => c.file_url);
    if (!firstValidChunk) return;

    if (!audio) {
      const newAudio = new Audio(firstValidChunk.file_url);
      newAudio.onended = () => setPlaying(false);
      setAudio(newAudio);
      newAudio.play();
      setPlaying(true);
    } else {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        audio.play();
        setPlaying(true);
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div className="spinner"></div>
    </div>
  );

  if (!recording) return <div className="empty-state"><h3 className="empty-title">Recording not found</h3></div>;

  const { chunks = [], summaries = {} } = recording;

  return (
    <div className="recording-detail page-enter">
      <div className="detail-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {editingTitle ? (
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input 
                className="search-input" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                autoFocus 
              />
              <button onClick={handleUpdateTitle} className="btn-ghost" style={{ color: 'var(--accent-green)' }}><Check size={20} /></button>
              <button onClick={() => setEditingTitle(false)} className="btn-ghost" style={{ color: 'var(--accent-red)' }}><X size={20} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="section-title" style={{ fontSize: '1.4rem' }}>{recording.title}</h2>
              <button onClick={() => setEditingTitle(true)} className="btn-ghost" style={{ opacity: 0.5 }}><Edit2 size={16} /></button>
            </div>
          )}
          <button className="btn-danger" style={{ padding: '8px', borderRadius: 'var(--radius-md)' }} onClick={handleDelete}>
            <Trash2 size={20} />
          </button>
        </div>

        <div className="recording-meta" style={{ marginTop: '12px' }}>
          <span className="recording-meta-item"><Calendar size={14} /> {format(new Date(recording.created_at), 'dd MMMM yyyy, HH:mm')}</span>
          <span className="recording-meta-item"><Clock size={14} /> {Math.floor((recording.duration || 0) / 60)}m {(recording.duration || 0) % 60}s</span>
          <span className={`sentiment sentiment-${summaries.sentiment || 'neutral'}`}>{summaries.sentiment || 'Neutral'}</span>
        </div>
      </div>

      {chunks.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="btn-primary"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={togglePlayback}
            >
              {playing ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Listen to Recording</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Generated from {chunks.length} chunks</p>
            </div>
          </div>
        </div>
      )}

      {summaries.summary && (
        <div className="detail-section">
          <h3 className="detail-section-title"><MessageSquare size={14} /> AI Summary</h3>
          <div className="card" style={{ background: 'rgba(124, 58, 237, 0.05)', borderColor: 'rgba(124, 58, 237, 0.2)' }}>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{summaries.summary}</p>
          </div>
        </div>
      )}

      {(summaries.key_points?.length > 0) && (
        <div className="detail-section">
          <h3 className="detail-section-title"><Zap size={14} /> Key Points</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summaries.key_points.map((p, i) => (
              <div key={i} className="key-point">
                <div className="key-dot"></div>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(summaries.action_items?.length > 0) && (
        <div className="detail-section">
          <h3 className="detail-section-title"><List size={14} /> Action Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summaries.action_items.map((item, i) => (
              <div key={i} className="action-item" style={{ borderColor: 'rgba(124, 58, 237, 0.2)' }}>
                <div className="action-dot"></div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summaries.full_transcript && (
        <div className="detail-section">
          <h3 className="detail-section-title"><FileText size={14} /> Full Transcript</h3>
          <div className="transcript-text">
            {summaries.full_transcript}
          </div>
        </div>
      )}
      
      <div className="safe-bottom"></div>
    </div>
  );
};

export default RecordingDetail;
