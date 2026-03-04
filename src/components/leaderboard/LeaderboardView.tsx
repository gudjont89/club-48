import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useSeasons } from '../../hooks/useSeasons';
import { useLocale } from '../../context/LocaleContext';
import styles from './LeaderboardView.module.css';

const DIVS = [
  { key: 'besta' as const, barClass: styles.barBesta },
  { key: 'fyrsta' as const, barClass: styles.barFyrsta },
  { key: 'annar' as const, barClass: styles.barAnnar },
  { key: 'thridi' as const, barClass: styles.barThridi },
];

export default function LeaderboardView() {
  const { t } = useLocale();
  const { maxSeason } = useSeasons();
  const { entries, loading, error } = useLeaderboard(maxSeason);

  if (loading) {
    return <div className={styles.message}>{t('leaderboard.loading')}</div>;
  }

  if (error) {
    return <div className={styles.message}>{t('leaderboard.error')}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className={styles.message}>
        {t('leaderboard.empty')}
      </div>
    );
  }

  const completedCount = entries.filter(p => p.totalGrounds === 48).length;
  const avgGrounds = Math.round(
    entries.reduce((sum, p) => sum + p.totalGrounds, 0) / entries.length
  );

  return (
    <>
      {/* Summary stats */}
      <div className={styles.summary}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{entries.length}</div>
          <div className={styles.statLabel}>{t('leaderboard.participants')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{completedCount}</div>
          <div className={styles.statLabel}>{t('leaderboard.completedAll')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{avgGrounds}</div>
          <div className={styles.statLabel}>{t('leaderboard.averageGrounds')}</div>
        </div>
      </div>

      {/* Leaderboard cards */}
      <div className={styles.list}>
        {entries.map((entry, i) => {
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
                          <span>{t(`leaderboard.div.${d.key}`)}</span>
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
