// src/components/Navigation.tsx
// Fixed to only include the Navigation component

import React from 'react';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView }) => {
  return (
    <nav className="mb-4">
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button 
            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Active Wagers
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${currentView === 'createWager' ? 'active' : ''}`}
            onClick={() => setCurrentView('createWager')}
          >
            Create Wager
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${currentView === 'myBets' ? 'active' : ''}`}
            onClick={() => setCurrentView('myBets')}
          >
            My Bets
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;