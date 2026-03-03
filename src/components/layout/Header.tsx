import { useLocation, useNavigate } from 'react-router-dom';
import { useVisits } from '../../context/VisitsContext';
import styles from './Header.module.css';

export default function Header() {
  const { getVisitedCount, attendedFixtures } = useVisits();
  const location = useLocation();
  const navigate = useNavigate();

  const visitedCount = getVisitedCount();
  const matchCount = attendedFixtures.size;
  const isGrounds = location.pathname === '/';
  const isLeaderboard = location.pathname === '/leaderboard';

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <h1 className={styles.title}>
          48 Klúbburinn {isGrounds && <span className={styles.titleDim}>/ Grounds</span>}
          {isLeaderboard && <span className={styles.titleDim}>/ Leaderboard</span>}
        </h1>
        <div className={styles.stats}>
          <span><strong>{visitedCount}</strong> of 48 grounds visited</span>
          <span><strong>{matchCount}</strong> matches attended</span>
        </div>
      </div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isGrounds ? styles.tabActive : ''}`}
          onClick={() => navigate('/')}
        >
          Grounds
        </button>
        <button
          className={`${styles.tab} ${isLeaderboard ? styles.tabActive : ''}`}
          onClick={() => navigate('/leaderboard')}
        >
          Leaderboard
        </button>
      </div>
    </header>
  );
}
