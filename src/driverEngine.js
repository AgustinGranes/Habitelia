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

export function getTeamLogoSVG(teamKey, size = 28) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`;
  
  switch (teamKey) {
    case 'Mercedes':
      return `<svg ${common}><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="12" y2="3"/><line x1="12" y1="12" x2="4.2" y2="16.5"/><line x1="12" y1="12" x2="19.8" y2="16.5"/></svg>`;
    case 'Ferrari':
      return `<svg ${common}><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"/><path d="M12 7v10M9 10l6 4"/></svg>`;
    case 'RedBull':
      return `<svg ${common}><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`;
    case 'McLaren':
      return `<svg ${common}><path d="M4 14c4-6 12-6 16 0"/><path d="M14 8c2 2 4 4 6 4"/></svg>`;
    case 'Aston':
      return `<svg ${common}><path d="M2 10h20M4 14h16M6 18h12"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`;
    case 'Alpine':
      return `<svg ${common}><path d="M12 3L3 20h5l4-8 4 8h5L12 3z"/></svg>`;
    case 'Racing':
      return `<svg ${common}><path d="M5 16l7-12 7 12H5z"/><circle cx="12" cy="13" r="2"/></svg>`;
    case 'Williams':
      return `<svg ${common}><path d="M4 4l4 16 4-10 4 10 4-16"/></svg>`;
    case 'Haas':
      return `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M8 8v8M16 8v8M8 12h8"/></svg>`;
    case 'Sauber':
      return `<svg ${common}><path d="M17 8A5 5 0 0 0 7 8c0 4 10 3 10 8a5 5 0 0 1-10 0"/></svg>`;
    case 'Hitech':
      return `<svg ${common}><path d="M5 5v14M19 5v14M5 12h14"/><line x1="12" y1="5" x2="12" y2="19"/></svg>`;
    case 'Campos':
      return `<svg ${common}><path d="M4 4h16v8H4z"/><path d="M4 12l8 8 8-8"/></svg>`;
    case 'DAMS':
      return `<svg ${common}><path d="M5 4h8a5 5 0 0 1 0 10H5V4z"/><path d="M5 14h9a5 5 0 0 1 0 10H5v-10z"/></svg>`;
    case 'MP':
      return `<svg ${common}><path d="M4 20V4l6 8 6-8v16"/></svg>`;
    case 'Trident':
      return `<svg ${common}><path d="M12 2v20M6 6l6 4 6-4M6 6v6a6 6 0 0 0 12 0V6"/></svg>`;
    case 'Van':
      return `<svg ${common}><path d="M4 6l8 12 8-12"/></svg>`;
    case 'Rodin':
      return `<svg ${common}><path d="M6 4h8a4 4 0 0 1 0 8H6V4z"/><path d="M12 12l6 8"/></svg>`;
    case 'Jenzer':
      return `<svg ${common}><path d="M16 4v12a4 4 0 0 1-8 0"/></svg>`;
    case 'Apex':
    default:
      return `<svg ${common}><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>`;
  }
}
