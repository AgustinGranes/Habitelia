// Driver Engine: Calculates Team, Category, Market Value, Wins, Podiums, Points
export const TEAMS_DATA = {
  Apex: { name: 'Apex', category: 'F4' },
  Rodin: { name: 'Rodin', category: 'F4' },
  Jenzer: { name: 'Jenzer', category: 'F4' },
  
  Van: { name: 'Van Amersfoort', category: 'F3' },
  Trident: { name: 'Trident', category: 'F3' },
  MP: { name: 'MP Motorsport', category: 'F3' },

  Campos: { name: 'Campos Racing', category: 'F2' },
  Hitech: { name: 'Hitech GP', category: 'F2' },
  DAMS: { name: 'DAMS Racing', category: 'F2' },

  Haas: { name: 'Haas F1', category: 'F1' },
  Sauber: { name: 'Sauber / Kick', category: 'F1' },
  Williams: { name: 'Williams Racing', category: 'F1' },

  Alpine: { name: 'Alpine F1', category: 'F1' },
  Racing: { name: 'Racing Bulls', category: 'F1' },

  Aston: { name: 'Aston Martin', category: 'F1' },
  McLaren: { name: 'McLaren F1', category: 'F1' },

  Ferrari: { name: 'Scuderia Ferrari', category: 'F1' },
  RedBull: { name: 'Red Bull Racing', category: 'F1' },

  Mercedes: { name: 'Mercedes-AMG', category: 'F1' }
};

export function getTeamForOVR(ovr) {
  if (ovr >= 95) return 'Mercedes';
  if (ovr >= 90) return 'Ferrari';
  if (ovr >= 86) return 'McLaren';
  if (ovr >= 83) return 'Racing';
  if (ovr >= 80) return 'Alpine';
  if (ovr >= 75) return 'Hitech';
  if (ovr >= 70) return 'Campos';
  if (ovr >= 65) return 'Trident';
  if (ovr >= 60) return 'Van';
  if (ovr >= 55) return 'Rodin';
  return 'Apex';
}

export function getCategoryForTeam(teamKey) {
  const team = TEAMS_DATA[teamKey];
  return team ? team.category : 'F4';
}

export function calculateMarketValue(ovr, titlesDriver, titlesConstructor) {
  const base = (ovr - 40) * 0.45;
  const titlesBonus = (titlesDriver * 4) + (titlesConstructor * 2);
  const val = Math.max(2.5, base + titlesBonus);
  return val.toFixed(1);
}

export function getOVRColor(ovr) {
  if (ovr >= 90) return '#7CDEDC'; // Neon Cyan / Teal exact from reference image
  if (ovr >= 80) return '#D69E2E'; // Yellow
  if (ovr >= 65) return '#DD6B20'; // Orange
  return '#E53E3E'; // Red
}

export function computeAccumulatedStats(ovr, seasons, habitCount = 0) {
  const winsBase = Math.floor(habitCount * 0.15 + (ovr >= 80 ? (ovr - 75) * 0.8 : 0));
  const wins = Math.max(0, winsBase);

  const podiumsBase = Math.floor(habitCount * 0.35 + (ovr >= 70 ? (ovr - 65) * 1.2 : 0));
  const podiums = Math.max(wins, podiumsBase);

  const pointsBase = Math.floor(habitCount * 6 + wins * 25 + podiums * 15 + (seasons - 1) * 150);
  const points = Math.max(0, pointsBase);

  return { wins, podiums, points };
}
