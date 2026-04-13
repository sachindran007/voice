import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, SearchX, X, Calendar, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRecordings, searchRecordings } from '../services/api';
import { format } from 'date-fns';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentRecordings, setRecentRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentRecordings = async () => {
      setInitialLoading(true);
      try {
        const data = await getRecordings();
        setRecentRecordings(data.recordings || []);
      } catch (err) {
        console.error('Failed to load recent recordings:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRecentRecordings();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 1) {
        performSearch();
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchRecordings(query);
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const recordingsToShow = searched ? results : recentRecordings;
  const showResultsList = recordingsToShow.length > 0;

  return (
    <div className="search-page">
      <div className="search-bar">
        <SearchIcon className="search-icon" size={20} />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search within transcripts..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={handleClear} className="btn-ghost" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      {loading || initialLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
          <Loader2 size={32} className="spinner" color="var(--accent-primary)" />
          <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {searched ? 'Searching database...' : 'Loading recent recordings...'}
          </p>
        </div>
      ) : searched && results.length === 0 ? (
        <div className="empty-state">
          <SearchX className="empty-icon" size={64} color="var(--text-muted)" />
          <h3 className="empty-title">No matches found</h3>
          <p className="empty-desc">We couldn't find any recordings matching "{query}". Try a different word.</p>
        </div>
      ) : showResultsList ? (
        <div className="recordings-list">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {searched ? `Found ${results.length} results` : `Recent recordings (${recentRecordings.length})`}
          </p>
          {recordingsToShow.map((res) => (
            <div key={res.id} className="recording-item" onClick={() => navigate(`/recording/${res.id}`)}>
              <div className="recording-item-header">
                <h3 className="recording-title">{res.title}</h3>
                <div className="recording-meta">
                  <span className="recording-meta-item">
                    <Calendar size={14} />
                    {format(new Date(res.created_at), 'dd MMM')}
                  </span>
                </div>
              </div>
              <p className="recording-summary" style={{ fontSize: '0.8rem' }}>
                {res.summary || res.summaries?.summary || res.summaries?.full_transcript || 'Transcript is still processing.'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="card-sm badge-processing" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--accent-orange)' }}>AI Power Search</h3>
            <p style={{ fontSize: '0.82rem', color: 'rgba(249,115,22,0.8)', lineHeight: '1.4' }}>
              We search through all AI transcripts and summaries to find exactly what you said.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
