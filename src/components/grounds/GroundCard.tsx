import type { GroundProgress, Division } from '../../types';
import styles from './GroundCard.module.css';

interface GroundCardProps {
  ground: GroundProgress;
  division: Division;
  isVisited: boolean;
  animationDelay: number;
  onClick: () => void;
}

const BG_MAP: Record<string, string> = {
  besta: styles.bgBesta,
  fyrsta: styles.bgFyrsta,
  annar: styles.bgAnnar,
  thridi: styles.bgThridi,
};

export default function GroundCard({ ground, division, isVisited, animationDelay, onClick }: GroundCardProps) {
  const bgClass = BG_MAP[division.cssKey] ?? '';

  return (
    <div
      className={`${styles.card} ${isVisited ? styles.isVisited : ''}`}
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className={styles.visitIndicator}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,7 6,10 11,4" />
        </svg>
      </div>

      <div className={`${styles.cardImg} ${bgClass}`}>
        <span className={styles.icon}>&#x2B21;</span>
        <span className={styles.capTag}>{ground.capacity.toLocaleString()}</span>
        <span className={styles.surfaceTag}>
          {ground.surface === 'artificial' ? 'Artificial' : ground.surface === 'grass' ? 'Natural' : 'Hybrid'}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.groundName}>{ground.groundName}</div>
        <div className={styles.groundCity}>{ground.groundCity}</div>
        <div className={styles.teamName}>{ground.shortName}</div>
      </div>
    </div>
  );
}
