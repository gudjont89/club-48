const is = {
  // Navigation
  'nav.grounds': 'Vellir',
  'nav.leaderboard': 'Stigatafla',

  // Header stats
  'stats.groundsVisited': 'vellir heimsóttir',
  'stats.matchesAttended': 'leikir sóttir',

  // Auth
  'auth.signIn': 'Innskráning',
  'auth.signOut': 'Útskráning',
  'auth.signInWithGoogle': 'Skrá inn með Google',
  'auth.or': 'eða',
  'auth.emailPlaceholder': 'Netfang',
  'auth.sendMagicLink': 'Senda innskráningartengil',
  'auth.checkEmail': 'Athugaðu tölvupóstinn þinn fyrir innskráningartengil.',
  'auth.showOnLeaderboard': 'Birta á stigatöflu',

  // Page subtitles
  'page.grounds': '/ Vellir',
  'page.leaderboard': '/ Stigatafla',

  // Loading / error
  'grounds.loading': 'Hleð völlum...',
  'grounds.error': 'Gat ekki hlaðið völlum: {{error}}',

  // Surface types
  'surface.artificial': 'Gervigras',
  'surface.natural': 'Gras',
  'surface.hybrid': 'Blandað',

  // Match picker
  'match.homeMatches': 'Heimaleikir',
  'match.loading': 'Hleð leikjum...',
  'match.noFixtures': 'Engir leikir á þessu tímabili',
  'match.attended': 'sóttur',
  'match.attendedCount': '{{count}} / {{total}} sóttir',
  'match.cancelled': 'aflýst',
  'match.postponed': 'frestað',
  'match.upcoming': 'á dagskrá',

  // Months
  'month.0': 'jan',
  'month.1': 'feb',
  'month.2': 'mar',
  'month.3': 'apr',
  'month.4': 'maí',
  'month.5': 'jún',
  'month.6': 'júl',
  'month.7': 'ágú',
  'month.8': 'sep',
  'month.9': 'okt',
  'month.10': 'nóv',
  'month.11': 'des',

  // Competitions
  'competition.league': 'Deild',
  'competition.cup': 'Bikar',
  'competition.fotboltinet_cup': 'Fotbolti.net bikar',
  'competition.league_cup': 'Deildabikar',
  'competition.super_cup': 'Ofurbikar',
  'competition.reykjavik_cup': 'Reykjavíkurbikar',
  'competition.champions_league': 'Meistaradeildin',
  'competition.europa_league': 'Evrópudeildin',
  'competition.conference_league': 'Sambandsdeildin',

  // Phase labels
  'phase.regular_season': '{{competition}} - {{round}}. umferð',
  'phase.championship': '{{competition}} (efri) - {{round}}. umferð',
  'phase.relegation': '{{competition}} (neðri) - {{round}}. umferð',
  'phase.promotion_playoffs': '{{competition}} - Uppgangsleikir',
  'phase.group_stage': '{{competition}} - Riðill ({{round}}. umferð)',
  'phase.qualifying': '{{competition}} - {{round}}. undankeppni',
  'phase.playoffs': '{{competition}} - Umspil',
  'phase.knockout': '{{competition}} - {{n}} liða úrslit',
  'phase.quarter_finals': '{{competition}} - Áttundarúrslit',
  'phase.semi_finals': '{{competition}} - Undanúrslit',
  'phase.final': '{{competition}} - Úrslit',

  // Matchday
  'matchday': '{{round}}. umferð',

  // Divisions
  'division.besta': 'Besta deild',
  'division.fyrsta': '1. deild',
  'division.annar': '2. deild',
  'division.thridi': '3. deild',

  // Leaderboard
  'leaderboard.loading': 'Hleð stigatöflu...',
  'leaderboard.error': 'Gat ekki hlaðið stigatöflu.',
  'leaderboard.empty': 'Engir þátttakendur ennþá. Skráðu þig inn og virkjaðu „Birta á stigatöflu" til að birtast hér.',
  'leaderboard.participants': 'Þátttakendur',
  'leaderboard.completedAll': 'Kláruðu alla 48',
  'leaderboard.averageGrounds': 'Meðaltal valla',

  // Leaderboard division short names
  'leaderboard.div.besta': 'Besta',
  'leaderboard.div.fyrsta': '1. deild',
  'leaderboard.div.annar': '2. deild',
  'leaderboard.div.thridi': '3. deild',
} as const;

export type TranslationKey = keyof typeof is;
export default is;
