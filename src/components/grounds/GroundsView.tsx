import { useState, useCallback } from 'react';
import { DIVISIONS } from '../../data/divisions';
import { useVisits } from '../../context/VisitsContext';
import { useLocale } from '../../context/LocaleContext';
import type { TranslationKey } from '../../i18n/is';
import { useGrounds, getGroundsByDivision } from '../../hooks/useGrounds';
import { useSeasons } from '../../hooks/useSeasons';
import GroundCard from './GroundCard';
import MatchPickerPanel from '../matchpicker/MatchPickerPanel';
import styles from './GroundsView.module.css';

const CSS_KEY_MAP: Record<string, string> = {
  besta: styles.divBesta,
  fyrsta: styles.divFyrsta,
  annar: styles.divAnnar,
  thridi: styles.divThridi,
};

export default function GroundsView() {
  const { isTeamVisited } = useVisits();
  const { t } = useLocale();
  const { minSeason, maxSeason } = useSeasons();
  const [panelTeamId, setPanelTeamId] = useState<number | null>(null);
  const [panelSeason, setPanelSeason] = useState(maxSeason);

  const { grounds, loading, error } = useGrounds(maxSeason);
  const groundsByDivision = getGroundsByDivision(grounds);

  const openPanel = useCallback((teamId: number) => {
    setPanelTeamId(teamId);
    setPanelSeason(maxSeason);
  }, [maxSeason]);

  const closePanel = useCallback(() => {
    setPanelTeamId(null);
  }, []);

  const changeSeason = useCallback((delta: number) => {
    setPanelSeason(prev => {
      const next = prev + delta;
      if (next < minSeason || next > maxSeason) return prev;
      return next;
    });
  }, [minSeason, maxSeason]);

  if (loading) {
    return <div className={styles.loading}>{t('grounds.loading')}</div>;
  }

  if (error) {
    return <div className={styles.error}>{t('grounds.error', { error: error ?? '' })}</div>;
  }

  return (
    <>
      {DIVISIONS.map(division => {
        const divGrounds = groundsByDivision.get(division.id) ?? [];
        if (divGrounds.length === 0) return null;
        const visitedCount = divGrounds.filter(g => isTeamVisited(g.teamId)).length;
        const divClass = CSS_KEY_MAP[division.cssKey] ?? '';

        return (
          <div key={division.id} className={`${styles.division} ${divClass}`}>
            <div className={styles.divisionHeader}>
              <div className={styles.divisionName}>{t(`division.${division.cssKey}` as TranslationKey)}</div>
              <div className={styles.divisionProgress}>
                {visitedCount} / {divGrounds.length}
              </div>
            </div>
            <div className={styles.cardsGrid}>
              {divGrounds.map((ground, i) => (
                <GroundCard
                  key={ground.teamId}
                  ground={ground}
                  division={division}
                  isVisited={isTeamVisited(ground.teamId)}
                  animationDelay={i * 0.04}
                  onClick={() => openPanel(ground.teamId)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <MatchPickerPanel
        isOpen={panelTeamId !== null}
        teamId={panelTeamId}
        grounds={grounds}
        season={panelSeason}
        minSeason={minSeason}
        maxSeason={maxSeason}
        onClose={closePanel}
        onChangeSeason={changeSeason}
      />
    </>
  );
}
