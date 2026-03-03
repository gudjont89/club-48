import { MOCK_LEADERBOARD } from '../../data/leaderboard';
import styles from './LeaderboardView.module.css';

const DIVS = [
  { key: 'besta' as const, name: 'Besta', barClass: styles.barBesta },
  { key: 'fyrsta' as const, name: '1. deild', barClass: styles.barFyrsta },
  { key: 'annar' as const, name: '2. deild', barClass: styles.barAnnar },
  { key: 'thridi' as const, name: '3. deild', barClass: styles.barThridi },
];

export default function LeaderboardView() {
  const participants = MOCK_LEADERBOARD;
  const completedCount = participants.filter(p => p.totalGrounds === 48).length;
  const avgGrounds = Math.round(
    participants.reduce((sum, p) => sum + p.totalGrounds, 0) / participants.length
  );

  return (
    <>
      {/* Summary stats */}
      <div className={styles.summary}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{participants.length}</div>
          <div className={styles.statLabel}>Participants</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{completedCount}</div>
          <div className={styles.statLabel}>Completed all 48</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{avgGrounds}</div>
          <div className={styles.statLabel}>Average grounds</div>
        </div>
      </div>

      {/* Leaderboard cards */}
      <div className={styles.list}>
        {participants.map((entry, i) => {
          const rank = i + 1;
          const isComplete = entry.totalGrounds === 48;
          const rankClass = rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : '';

          return (
            <div
              key={entry.userId}
              className={`${styles.card} ${rankClass}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className={styles.rank}>{rank}</div>

              <div className={styles.info}>
                <div className={styles.name}>
                  {entry.displayName}
                  {isComplete && <span className={styles.completeBadge}>48 &#x2713;</span>}
                </div>
                <div className={styles.bars}>
                  {DIVS.map(d => {
                    const val = entry.divisions[d.key];
                    const pct = (val / 12) * 100;
                    return (
                      <div key={d.key} className={styles.barGroup}>
                        <div className={styles.barLabel}>
                          <span>{d.name}</span>
                          <span>{val}/12</span>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${d.barClass} ${pct === 100 ? styles.barComplete : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.total}>
                <div className={styles.totalNum}>{entry.totalGrounds}</div>
                <div className={styles.totalLabel}>/ 48</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
