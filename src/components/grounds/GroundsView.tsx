import { useState, useCallback } from 'react';
import { DIVISIONS } from '../../data/divisions';
import { useVisits } from '../../context/VisitsContext';
import { useGrounds, getGroundsByDivision } from '../../hooks/useGrounds';
import GroundCard from './GroundCard';
import MatchPickerPanel from '../matchpicker/MatchPickerPanel';
import styles from './GroundsView.module.css';

const CSS_KEY_MAP: Record<string, string> = {
  besta: styles.divBesta,
  fyrsta: styles.divFyrsta,
  annar: styles.divAnnar,
  thridi: styles.divThridi,
};

const MIN_SEASON = 2020;
const MAX_SEASON = 2025;

export default function GroundsView() {
  const { isTeamVisited } = useVisits();
  const [panelTeamId, setPanelTeamId] = useState<number | null>(null);
  const [panelSeason, setPanelSeason] = useState(MAX_SEASON);

  const { grounds, loading, error } = useGrounds(MAX_SEASON);
  const groundsByDivision = getGroundsByDivision(grounds);

  const openPanel = useCallback((teamId: number) => {
    setPanelTeamId(teamId);
  }, []);

  const closePanel = useCallback(() => {
    setPanelTeamId(null);
  }, []);

  const changeSeason = useCallback((delta: number) => {
    setPanelSeason(prev => {
      const next = prev + delta;
      if (next < MIN_SEASON || next > MAX_SEASON) return prev;
      return next;
    });
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading grounds...</div>;
  }

  if (error) {
    return <div className={styles.error}>Failed to load grounds: {error}</div>;
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
              <div className={styles.divisionName}>{division.name}</div>
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
        onClose={closePanel}
        onChangeSeason={changeSeason}
      />
    </>
  );
}
