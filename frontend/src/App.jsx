import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Mic, History, Search, Settings, Shield, ChevronLeft, Github } from 'lucide-react';

import Home from './pages/Home';
import HistoryPage from './pages/History';
import SearchPage from './pages/Search';
import RecordingDetail from './pages/RecordingDetail';

const App = () => {
  return (
    <Router>
      <div className="app-layout">
        <Header />
        
        <main className="page page-enter">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/recording/:id" element={<RecordingDetail />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </Router>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDetail = location.pathname.startsWith('/recording/');

  return (
    <header className="header">
      <div className="header-logo">
        {isDetail ? (
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px', marginLeft: '-8px' }}>
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="header-logo-icon">
            <Mic size={20} color="white" />
          </div>
        )}
        <h1 className="header-title">
          {isDetail ? 'Recording Details' : 'VoiceAI'}
        </h1>
      </div>
      
      <div className="header-actions">
        <button className="btn-ghost" style={{ padding: '8px' }}>
          <Shield size={20} />
        </button>
      </div>
    </header>
  );
};

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Mic className="nav-icon" size={24} />
        <span>Record</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <History className="nav-icon" size={24} />
        <span>History</span>
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Search className="nav-icon" size={24} />
        <span>Search</span>
      </NavLink>
    </nav>
  );
};

export default App;
