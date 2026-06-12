import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Overview from './pages/Overview';
import Telemetry from './pages/Telemetry';
import Aeroelastic from './pages/Aeroelastic';
import Simulator from './pages/Simulator';
import Outputs from './pages/Outputs';
import Documentation from './pages/Documentation';
import { useTelemetry } from './hooks/useTelemetry';
import { Activity } from 'lucide-react';

function App() {
  const { connected } = useTelemetry('ws://127.0.0.1:8000/ws');

  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="header">
          <div className="header-left">
            <div className="logo-box">
              <div className="gla-badge">GLA</div>
              <div className="project-title">
                <span className="project-code">USI-R1B40-0212-23</span>
                <span className="project-name">Gust Load Alleviation • Digital Twin</span>
              </div>
            </div>
            
            <nav className="nav-tabs">
              <NavLink to="/" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`} end>
                GENEL BAKIŞ
              </NavLink>
              <NavLink to="/outputs" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
                MODEL ÇIKTILARI
              </NavLink>
              <NavLink to="/telemetry" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
                <Activity size={14} />
                2B TELEMETRİ
              </NavLink>
              <NavLink to="/aeroelastic" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
                3B AEROELASTİK
              </NavLink>
              <NavLink to="/simulator" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
                UÇUŞ SİMÜLATÖRÜ
              </NavLink>
              <NavLink to="/docs" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
                DOKÜMANTASYON
              </NavLink>
            </nav>
          </div>
          
          <div className="header-right">
            <div className={`link-status ${connected ? 'connected' : ''}`}>
              <div className="link-dot"></div>
              {connected ? 'LINK - UP' : 'LINK - DOWN'}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/outputs" element={<Outputs />} />
            <Route path="/telemetry" element={<Telemetry />} />
            <Route path="/aeroelastic" element={<Aeroelastic />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/docs" element={<Documentation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
