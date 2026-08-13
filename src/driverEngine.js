// Driver Engine: Calculates Team, Category, Market Value, Wins, Podiums, Points
export const TEAMS_DATA = {
  Apex: { name: 'Apex', category: 'F4', logo: 'apex' },
  Rodin: { name: 'Rodin', category: 'F4', logo: 'rodin' },
  Jenzer: { name: 'Jenzer', category: 'F4', logo: 'jenzer' },
  
  Van: { name: 'Van Amersfoort', category: 'F3', logo: 'var' },
  Trident: { name: 'Trident', category: 'F3', logo: 'trident' },
  MP: { name: 'MP Motorsport', category: 'F3', logo: 'mp' },

  Campos: { name: 'Campos', category: 'F2', logo: 'campos' },
  Hitech: { name: 'Hitech', category: 'F2', logo: 'hitech' },
  DAMS: { name: 'DAMS', category: 'F2', logo: 'dams' },

  Haas: { name: 'Haas', category: 'F1', logo: 'haas' },
  Sauber: { name: 'Sauber', category: 'F1', logo: 'sauber' },
  Williams: { name: 'Williams', category: 'F1', logo: 'williams' },

  Alpine: { name: 'Alpine', category: 'F1', logo: 'alpine' },
  Racing: { name: 'Racing Bulls', category: 'F1', logo: 'rb' },

  Aston: { name: 'Aston Martin', category: 'F1', logo: 'aston' },
  McLaren: { name: 'McLaren', category: 'F1', logo: 'mclaren' },

  Ferrari: { name: 'Ferrari', category: 'F1', logo: 'ferrari' },
  RedBull: { name: 'Red Bull', category: 'F1', logo: 'redbull' },

  Mercedes: { name: 'Mercedes', category: 'F1', logo: 'mercedes' }
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

export function calculateMarketValue(ovr, titlesDriver, titlesConstructor) {
  // Real scale: €2.5M in F4 (50 OVR) up to €30M+ in F1 Top (95+ OVR)
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

export function computeAccumulatedStats(ovr, seasons, habitCount) {
  // Realistic stats scale based on seasons, habits and OVR
  const wins = Math.floor((ovr - 45) * 1.8 + seasons * 3);
  const podiums = Math.floor(wins * 2.1 + seasons * 4);
  const points = Math.floor(podiums * 18 + habitCount * 12 + seasons * 120);
  return {
    wins: Math.max(0, wins),
    podiums: Math.max(0, podiums),
    points: Math.max(0, points)
  };
}
