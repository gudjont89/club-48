import { useEffect, useMemo } from 'react';
import { GROUNDS } from '../../data/grounds';
import { DIVISION_MAP } from '../../data/divisions';
import { generateFixtures } from '../../data/fixtures';
import { useVisits } from '../../context/VisitsContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { getMatchResult } from '../../types';
import styles from './MatchPickerPanel.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_YEAR = 2022;
const MAX_YEAR = 2026;

interface MatchPickerPanelProps {
  isOpen: boolean;
  teamId: number | null;
  season: number;
  onClose: () => void;
  onChangeSeason: (delta: number) => void;
}

export default function MatchPickerPanel({ isOpen, teamId, season, onClose, onChangeSeason }: MatchPickerPanelProps) {
  const { isAttended, toggleAttendance } = useVisits();

  const ground = teamId ? GROUNDS.find(g => g.teamId === teamId) : null;
  const division = ground ? DIVISION_MAP[ground.division] : null;

  const fixtures = useMemo(() => {
    if (!ground) return [];
    return generateFixtures(ground.shortName, season);
  }, [ground, season]);

  const leagueFixtures = fixtures.filter(f => f.competition === 'league');
  const cupFixtures = fixtures.filter(f => f.competition === 'cup');
  const attendedCount = fixtures.filter(f => isAttended(f.fixtureId)).length;

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Keyboard navigation
  useKeyboard({
    onEscape: onClose,
    onArrowLeft: () => onChangeSeason(-1),
    onArrowRight: () => onChangeSeason(1),
    enabled: isOpen,
  });

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />

      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        {ground && division && (
          <>
            {/* Panel Header */}
            <div className={styles.panelTop}>
              <div className={styles.panelHeaderRow}>
                <div>
                  <div className={styles.panelGround}>{ground.groundName}</div>
                  <div className={styles.panelCity}>{ground.groundCity}</div>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>&#x2715;</button>
              </div>
              <div className={styles.panelTeam}>{ground.shortName} &middot; {division.name}</div>
              <div className={styles.panelMeta}>
                <span>Cap. {ground.capacity.toLocaleString()}</span>
                <span>{ground.surface === 'artificial' ? 'Artificial' : ground.surface === 'grass' ? 'Natural' : 'Hybrid'}</span>
                <span>{ground.groundCity}</span>
              </div>
            </div>

            {/* Year Navigator */}
            <div className={styles.yearNav}>
              <button
                className={styles.yearArrow}
                onClick={() => onChangeSeason(-1)}
                disabled={season <= MIN_YEAR}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9,2 4,7 9,12" />
                </svg>
              </button>
              <div className={styles.yearLabel}>
                {season}
                <span className={styles.yearCount}>{attendedCount} / {fixtures.length} attended</span>
              </div>
              <button
                className={styles.yearArrow}
                onClick={() => onChangeSeason(1)}
                disabled={season >= MAX_YEAR}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="5,2 10,7 5,12" />
                </svg>
              </button>
            </div>

            {/* Fixtures */}
            <div className={styles.fixturesArea}>
              {fixtures.length === 0 ? (
                <div className={styles.noFixtures}>No fixtures for this season</div>
              ) : (
                <>
                  {leagueFixtures.length > 0 && (
                    <>
                      <div className={styles.sectionLabel}>
                        League &middot; {leagueFixtures.length} home matches
                      </div>
                      <div className={styles.fixtureList}>
                        {leagueFixtures.map(fix => {
                          const d = new Date(fix.matchDate + 'T12:00:00');
                          const attended = isAttended(fix.fixtureId);
                          const result = getMatchResult(fix.homeGoals, fix.awayGoals);
                          const played = fix.status === 'FT';
                          const scoreCls = result === 'W' ? styles.scoreW : result === 'L' ? styles.scoreL : styles.scoreD;

                          return (
                            <div
                              key={fix.fixtureId}
                              className={`${styles.fixtureRow} ${attended ? styles.attended : ''} ${!played ? styles.upcoming : ''}`}
                              onClick={() => played && teamId && toggleAttendance(fix.fixtureId, teamId)}
                            >
                              <div className={styles.fixDate}>
                                <span className={styles.fixDay}>{d.getDate()}</span>
                                <span className={styles.fixMon}>{MONTHS[d.getMonth()]}</span>
                              </div>
                              <div>
                                <div className={styles.opponent}>v {fix.opponentName}</div>
                                <div className={styles.meta}>
                                  R{fix.round} &middot; {fix.kickoffTime} &middot; {ground.groundName}
                                </div>
                              </div>
                              <div className={styles.fixRight}>
                                {played ? (
                                  <div className={`${styles.fixScore} ${scoreCls}`}>
                                    {fix.homeGoals} &ndash; {fix.awayGoals}
                                  </div>
                                ) : (
                                  <div className={styles.fixUpcoming}>upcoming</div>
                                )}
                                <div className={styles.attendedCheck}>&#x2713; attended</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {cupFixtures.length > 0 && (
                    <>
                      <div className={`${styles.sectionLabel} ${styles.sectionLabelCup}`}>
                        Borgunarbikarinn &middot; {cupFixtures.length} matches
                      </div>
                      <div className={styles.fixtureList}>
                        {cupFixtures.map(fix => {
                          const d = new Date(fix.matchDate + 'T12:00:00');
                          const attended = isAttended(fix.fixtureId);
                          const result = getMatchResult(fix.homeGoals, fix.awayGoals);
                          const played = fix.status === 'FT';
                          const scoreCls = result === 'W' ? styles.scoreW : result === 'L' ? styles.scoreL : styles.scoreD;

                          return (
                            <div
                              key={fix.fixtureId}
                              className={`${styles.fixtureRow} ${styles.isCup} ${attended ? styles.attended : ''} ${!played ? styles.upcoming : ''}`}
                              onClick={() => played && teamId && toggleAttendance(fix.fixtureId, teamId)}
                            >
                              <div className={styles.fixDate}>
                                <span className={styles.fixDay}>{d.getDate()}</span>
                                <span className={styles.fixMon}>{MONTHS[d.getMonth()]}</span>
                              </div>
                              <div>
                                <div className={styles.opponent}>v {fix.opponentName}</div>
                                <div className={styles.meta}>
                                  Cup &middot; {fix.kickoffTime} &middot; {ground.groundName}
                                </div>
                              </div>
                              <div className={styles.fixRight}>
                                {played ? (
                                  <div className={`${styles.fixScore} ${scoreCls}`}>
                                    {fix.homeGoals} &ndash; {fix.awayGoals}
                                  </div>
                                ) : (
                                  <div className={styles.fixUpcoming}>upcoming</div>
                                )}
                                <div className={styles.attendedCheck}>&#x2713; attended</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
