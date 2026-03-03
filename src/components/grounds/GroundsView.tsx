import { useState, useCallback } from 'react';
import { GROUNDS, getGroundsByDivision } from '../../data/grounds';
import { DIVISIONS } from '../../data/divisions';
import { useVisits } from '../../context/VisitsContext';
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
  const { isTeamVisited, getVisitedCountByDivision } = useVisits();
  const [panelTeamId, setPanelTeamId] = useState<number | null>(null);
  const [panelSeason, setPanelSeason] = useState(2025);

  const groundsByDivision = getGroundsByDivision(GROUNDS);

  const openPanel = useCallback((teamId: number) => {
    setPanelTeamId(teamId);
  }, []);

  const closePanel = useCallback(() => {
    setPanelTeamId(null);
  }, []);

  const changeSeason = useCallback((delta: number) => {
    setPanelSeason(prev => {
      const next = prev + delta;
      if (next < 2022 || next > 2026) return prev;
      return next;
    });
  }, []);

  return (
    <>
      {DIVISIONS.map(division => {
        const grounds = groundsByDivision.get(division.id) ?? [];
        const visitedCount = getVisitedCountByDivision(division.id);
        const divClass = CSS_KEY_MAP[division.cssKey] ?? '';

        return (
          <div key={division.id} className={`${styles.division} ${divClass}`}>
            <div className={styles.divisionHeader}>
              <div className={styles.divisionName}>{division.name}</div>
              <div className={styles.divisionProgress}>
                {visitedCount} / {grounds.length}
              </div>
            </div>
            <div className={styles.cardsGrid}>
              {grounds.map((ground, i) => (
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
        season={panelSeason}
        onClose={closePanel}
        onChangeSeason={changeSeason}
      />
    </>
  );
}
