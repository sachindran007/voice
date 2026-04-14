import React from 'react';
import { Mic, Square, Loader2, Info } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { 
    isRecording, 
    isProcessing, 
    formattedTime, 
    startRecording, 
    stopRecording, 
    currentRecordingId,
    error 
  } = useRecorder();
  
  const navigate = useNavigate();

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="record-btn-wrapper">
        <div className={`record-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
             onClick={isRecording ? stopRecording : (isProcessing ? null : startRecording)}>
          {isProcessing ? (
            <Loader2 size={48} color="white" className="spinner-animation" />
          ) : isRecording ? (
            <Square size={40} color="white" fill="white" />
          ) : (
            <Mic size={48} color="white" />
          )}
        </div>
        
        <div className="timer-section" style={{ textAlign: 'center' }}>
          <div className="timer">{formattedTime}</div>
          <div className="chunk-counter">{isRecording ? 'Recording in progress' : isProcessing ? 'Uploading full recording' : 'Ready to record'}</div>
        </div>
      </div>

      {isRecording && (
        <div className="waveform-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div className="waveform">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="wave-bar"></div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card-sm badge-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={16} />
          <span>{error}</span>
        </div>
      )}

      {isProcessing && currentRecordingId && (
        <div className="card" style={{ marginTop: 'auto', textAlign: 'center' }}>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Processing your recording...</p>
          <button className="btn btn-primary" onClick={() => navigate(`/recording/${currentRecordingId}`)}>
            View Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
