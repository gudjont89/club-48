import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVisits } from '../../context/VisitsContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import styles from './Header.module.css';

export default function Header() {
  const { visitedTeams, attendedFixtures } = useVisits();
  const { user, loading: authLoading, profile, signInWithGoogle, signInWithEmail, signOut, updateProfile } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const visitedCount = visitedTeams.size;
  const matchCount = attendedFixtures.size;
  const isGrounds = location.pathname === '/';
  const isLeaderboard = location.pathname === '/leaderboard';

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const { error } = await signInWithEmail(emailInput);
    if (error) {
      setAuthError(error);
    } else {
      setEmailSent(true);
    }
  }

  const displayName = user?.user_metadata?.full_name
    ?? user?.user_metadata?.display_name
    ?? user?.email?.split('@')[0]
    ?? 'User';

  const avatarUrl = user?.user_metadata?.avatar_url ?? null;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <h1 className={styles.title}>
          48 Klúbburinn {isGrounds && <span className={styles.titleDim}>{t('page.grounds')}</span>}
          {isLeaderboard && <span className={styles.titleDim}>{t('page.leaderboard')}</span>}
        </h1>
        <div className={styles.headerRight}>
          <div className={styles.stats}>
            <span><strong>{visitedCount}</strong> {t('stats.groundsVisited')}</span>
            <span><strong>{matchCount}</strong> {t('stats.matchesAttended')}</span>
          </div>
          <button
            className={styles.langToggle}
            onClick={() => setLocale(locale === 'is' ? 'en' : 'is')}
          >
            {locale === 'is' ? 'EN' : 'IS'}
          </button>
          {!authLoading && (
            <div className={styles.authArea}>
              {user ? (
                <button className={styles.userButton} onClick={() => setShowAuthMenu(prev => !prev)}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
                  ) : (
                    <span className={styles.avatarFallback}>{displayName[0].toUpperCase()}</span>
                  )}
                </button>
              ) : (
                <button className={styles.signInButton} onClick={() => setShowAuthMenu(prev => !prev)}>
                  {t('auth.signIn')}
                </button>
              )}

              {showAuthMenu && (
                <>
                  <div className={styles.menuBackdrop} onClick={() => { setShowAuthMenu(false); setEmailSent(false); setAuthError(null); }} />
                  <div className={styles.authMenu}>
                    {user ? (
                      <>
                        <div className={styles.menuUser}>
                          <span className={styles.menuName}>{displayName}</span>
                          {user.email && <span className={styles.menuEmail}>{user.email}</span>}
                        </div>
                        <label className={styles.toggleRow}>
                          <span>{t('auth.showOnLeaderboard')}</span>
                          <input
                            type="checkbox"
                            checked={profile?.isPublic ?? false}
                            onChange={e => updateProfile({ isPublic: e.target.checked })}
                            className={styles.toggle}
                          />
                        </label>
                        <button className={styles.menuItem} onClick={() => { signOut(); setShowAuthMenu(false); }}>
                          {t('auth.signOut')}
                        </button>
                      </>
                    ) : emailSent ? (
                      <div className={styles.menuMessage}>
                        {t('auth.checkEmail')}
                      </div>
                    ) : (
                      <>
                        <button className={styles.googleButton} onClick={signInWithGoogle}>
                          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          {t('auth.signInWithGoogle')}
                        </button>
                        <div className={styles.menuDivider}>{t('auth.or')}</div>
                        <form onSubmit={handleEmailSubmit} className={styles.emailForm}>
                          <input
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            className={styles.emailInput}
                            required
                          />
                          <button type="submit" className={styles.emailSubmit}>
                            {t('auth.sendMagicLink')}
                          </button>
                        </form>
                        {authError && <div className={styles.menuError}>{authError}</div>}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isGrounds ? styles.tabActive : ''}`}
          onClick={() => navigate('/')}
        >
          {t('nav.grounds')}
        </button>
        <button
          className={`${styles.tab} ${isLeaderboard ? styles.tabActive : ''}`}
          onClick={() => navigate('/leaderboard')}
        >
          {t('nav.leaderboard')}
        </button>
      </div>
    </header>
  );
}
