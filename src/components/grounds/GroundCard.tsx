import { useState, lazy, Suspense } from 'react';
import type { GroundProgress, Division } from '../../types';
import { useLocale } from '../../context/LocaleContext';
import styles from './GroundCard.module.css';

const MiniMap = lazy(() => import('./MiniMap'));

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
  const { t } = useLocale();
  const bgClass = BG_MAP[division.cssKey] ?? '';
  const [imgError, setImgError] = useState(false);
  const showImage = ground.groundImageUrl && !imgError;
  const hasCoords = ground.latitude !== 0 && ground.longitude !== 0;

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
        {showImage && (
          <img
            src={ground.groundImageUrl!}
            alt={ground.groundName}
            className={styles.groundPhoto}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {!showImage && hasCoords && (
          <Suspense fallback={<span className={styles.icon}>&#x2B21;</span>}>
            <MiniMap latitude={ground.latitude} longitude={ground.longitude} className={styles.groundPhoto} />
          </Suspense>
        )}
        {!showImage && !hasCoords && <span className={styles.icon}>&#x2B21;</span>}
        <span className={styles.capTag}>{ground.capacity.toLocaleString()}</span>
        <span className={styles.surfaceTag}>
          {ground.surface === 'artificial' ? t('surface.artificial') : ground.surface === 'grass' ? t('surface.natural') : t('surface.hybrid')}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.groundName}>{ground.groundName}</div>
        <div className={styles.groundCity}>{ground.groundCity}</div>
        <div className={styles.teamRow}>
          {ground.teamLogoUrl && (
            <img
              src={ground.teamLogoUrl}
              alt={ground.shortName}
              className={styles.teamLogo}
              loading="lazy"
            />
          )}
          <span className={styles.teamName}>{ground.teamName}</span>
        </div>
      </div>
    </div>
  );
}
