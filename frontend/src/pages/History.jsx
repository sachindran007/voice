import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Calendar, Clock, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { getRecordings } from '../services/api';
import { format } from 'date-fns';

const HistoryPage = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const data = await getRecordings();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="history-page">
      <div className="section-header">
        <h2 className="section-title">Recent Recordings</h2>
        <button onClick={fetchRecordings} className="btn-ghost" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner"></div>
        </div>
      ) : recordings.length === 0 ? (
        <div className="empty-state">
          <History className="empty-icon" size={64} color="var(--text-muted)" />
          <h3 className="empty-title">No recordings yet</h3>
          <p className="empty-desc">Your voice recordings and AI summaries will appear here after you record something.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/')}>
            Start Recording
          </button>
        </div>
      ) : (
        <div className="recordings-list">
          {recordings.map((rec) => (
            <div key={rec.id} className="recording-item" onClick={() => navigate(`/recording/${rec.id}`)}>
              <div className="recording-item-header">
                <div>
                  <h3 className="recording-title">{rec.title}</h3>
                  <div className="recording-meta">
                    <span className="recording-meta-item">
                      <Calendar size={14} />
                      {format(new Date(rec.created_at), 'dd MMM, HH:mm')}
                    </span>
                    <span className="recording-meta-item">
                      <Clock size={14} />
                      {formatDuration(rec.duration || 0)}
                    </span>
                  </div>
                </div>
                <div className={`badge badge-${rec.status}`}>
                  <div className="badge-dot"></div>
                  {rec.status}
                </div>
              </div>
              
              {rec.summaries?.summary && (
                <p className="recording-summary">{rec.summaries.summary}</p>
              )}
              
              {rec.summaries?.sentiment && (
                <div className="sentiment-wrapper">
                  <span className={`sentiment sentiment-${rec.summaries.sentiment}`}>
                    {rec.summaries.sentiment}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
