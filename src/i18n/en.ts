import type { TranslationKey } from './is';

const en: Record<TranslationKey, string> = {
  // Navigation
  'nav.grounds': 'Grounds',
  'nav.leaderboard': 'Leaderboard',

  // Header stats
  'stats.groundsVisited': 'grounds visited',
  'stats.matchesAttended': 'matches attended',

  // Auth
  'auth.signIn': 'Sign in',
  'auth.signOut': 'Sign out',
  'auth.signInWithGoogle': 'Sign in with Google',
  'auth.or': 'or',
  'auth.emailPlaceholder': 'Email address',
  'auth.sendMagicLink': 'Send magic link',
  'auth.checkEmail': 'Check your email for a sign-in link.',
  'auth.showOnLeaderboard': 'Show on leaderboard',

  // Page subtitles
  'page.grounds': '/ Grounds',
  'page.leaderboard': '/ Leaderboard',

  // Loading / error
  'grounds.loading': 'Loading grounds...',
  'grounds.error': 'Failed to load grounds: {{error}}',

  // Surface types
  'surface.artificial': 'Artificial',
  'surface.natural': 'Natural',
  'surface.hybrid': 'Hybrid',

  // Match picker
  'match.homeMatches': 'Home matches',
  'match.loading': 'Loading fixtures...',
  'match.noFixtures': 'No fixtures for this season',
  'match.attended': 'attended',
  'match.attendedCount': '{{count}} / {{total}} attended',
  'match.cancelled': 'cancelled',
  'match.postponed': 'postponed',
  'match.upcoming': 'upcoming',

  // Months
  'month.0': 'Jan',
  'month.1': 'Feb',
  'month.2': 'Mar',
  'month.3': 'Apr',
  'month.4': 'May',
  'month.5': 'Jun',
  'month.6': 'Jul',
  'month.7': 'Aug',
  'month.8': 'Sep',
  'month.9': 'Oct',
  'month.10': 'Nov',
  'month.11': 'Dec',

  // Competitions
  'competition.league': 'League',
  'competition.cup': 'Cup',
  'competition.league_cup': 'League Cup',
  'competition.super_cup': 'Super Cup',
  'competition.reykjavik_cup': 'Reykjavik Cup',
  'competition.champions_league': 'Champions League',
  'competition.europa_league': 'Europa League',
  'competition.conference_league': 'Conference League',

  // Phase labels
  'phase.regular_season': '{{competition}} - Matchday {{round}}',
  'phase.championship': '{{competition}} (Championship) - Matchday {{round}}',
  'phase.relegation': '{{competition}} (Relegation) - Matchday {{round}}',
  'phase.promotion_playoffs': '{{competition}} - Promotion Play-offs',
  'phase.group_stage': '{{competition}} - Group Stage (Matchday {{round}})',
  'phase.qualifying': '{{competition}} - Qualifying Round {{round}}',
  'phase.playoffs': '{{competition}} - Play-offs',
  'phase.knockout': '{{competition}} - Round of {{n}}',
  'phase.quarter_finals': '{{competition}} - Quarter-finals',
  'phase.semi_finals': '{{competition}} - Semi-finals',
  'phase.final': '{{competition}} - Final',

  // Matchday
  'matchday': 'Matchday {{round}}',

  // Divisions
  'division.besta': 'Besta deild',
  'division.fyrsta': '1. deild',
  'division.annar': '2. deild',
  'division.thridi': '3. deild',

  // Leaderboard
  'leaderboard.loading': 'Loading leaderboard...',
  'leaderboard.error': 'Failed to load leaderboard.',
  'leaderboard.empty': 'No participants yet. Sign in and enable "Show on leaderboard" to appear here.',
  'leaderboard.participants': 'Participants',
  'leaderboard.completedAll': 'Completed all 48',
  'leaderboard.averageGrounds': 'Average grounds',

  // Leaderboard division short names
  'leaderboard.div.besta': 'Besta',
  'leaderboard.div.fyrsta': '1. deild',
  'leaderboard.div.annar': '2. deild',
  'leaderboard.div.thridi': '3. deild',
};

export default en;
