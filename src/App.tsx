import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import GroundsView from './components/grounds/GroundsView';
import LeaderboardView from './components/leaderboard/LeaderboardView';

export default function App() {
  return (
    <>
      <Header />
      <div className="main">
        <Routes>
          <Route path="/" element={<GroundsView />} />
          <Route path="/leaderboard" element={<LeaderboardView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
