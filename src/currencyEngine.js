// Live Currency Conversion Engine for Habitelia (ported & enhanced from WhereToPit)

const FX_API_KEY = 'fxr_live_a11627c992803c65baf4ada7ed8a3c8e8691';

const FALLBACK_USD_ARS = 1434;
const FALLBACK_FX = {
  EUR: 0.8484,
  GBP: 0.7336,
  JPY: 156.69,
  AUD: 1.3799,
  NZD: 1.6761,
  BRL: 4.8958,
};

let _usdArs = null;   // ARS per 1 USD
let _fxRates = null;  // Rates per 1 USD
let _ratesTs = 0;

export async function fetchRealRates() {
  if (_usdArs && _fxRates && Date.now() - _ratesTs < 3_600_000) return;

  // 1. Fetch Official Dólar ARS
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
    const data = await res.json();
    const venta = parseFloat(data.venta);
    if (venta > 500 && venta < 5000) {
      _usdArs = venta;
    }
  } catch (e) {
    console.warn('Error fetching official dollar, using fallback:', e);
  }
  if (!_usdArs) _usdArs = FALLBACK_USD_ARS;

  // 2. Fetch FX Cross Rates from fxRatesAPI
  try {
    const res = await fetch(
      `https://api.fxratesapi.com/latest?api_key=${FX_API_KEY}&base=USD&currencies=EUR,GBP,JPY,AUD,NZD,BRL`
    );
    const data = await res.json();
    if (data.success && data.rates) {
      _fxRates = data.rates;
    }
  } catch (e) {
    console.warn('Error fetching FX cross rates, using fallback:', e);
  }
  if (!_fxRates) _fxRates = FALLBACK_FX;

  _ratesTs = Date.now();
}

export async function convertToARSWithCommission(amount, currency, commission = 0) {
  if (!amount || amount === 0) return 0;
  await fetchRealRates();
  const factor = 1 + (commission || 0);

  if (currency === 'ARS') return amount * factor;
  if (currency === 'USD') return amount * _usdArs * factor;

  const rateVsUsd = _fxRates[currency] ?? FALLBACK_FX[currency] ?? 1;
  const arsPerUnit = (1 / rateVsUsd) * _usdArs;
  return amount * arsPerUnit * factor;
}

export function formatPrice(ars) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(ars);
}

export async function getRateSummary() {
  await fetchRealRates();
  const eur = _fxRates?.EUR ? ((1 / _fxRates.EUR) * _usdArs).toFixed(0) : '—';
  const gbp = _fxRates?.GBP ? ((1 / _fxRates.GBP) * _usdArs).toFixed(0) : '—';
  const jpy = _fxRates?.JPY ? ((1 / _fxRates.JPY) * _usdArs).toFixed(2) : '—';
  const aud = _fxRates?.AUD ? ((1 / _fxRates.AUD) * _usdArs).toFixed(0) : '—';
  return `USD: $${_usdArs?.toFixed(0)} · EUR: $${eur} · GBP: $${gbp} · AUD: $${aud} · JPY: $${jpy}`;
}

export const PRESET_PLATFORMS = [
  { name: 'F1 TV Pro', price: 6.99, cur: 'USD', defaultCommission: 0.08 },
  { name: 'Disney+ Standard', price: 7399, cur: 'ARS', defaultCommission: 0 },
  { name: 'Netflix Estándar', price: 6899, cur: 'ARS', defaultCommission: 0.08 },
  { name: 'Max (HBO)', price: 4990, cur: 'ARS', defaultCommission: 0 },
  { name: 'Amazon Prime Video', price: 3999, cur: 'ARS', defaultCommission: 0.08 },
  { name: 'Spotify Individual', price: 2499, cur: 'ARS', defaultCommission: 0.08 },
  { name: 'YouTube Premium', price: 1899, cur: 'ARS', defaultCommission: 0.08 },
  { name: 'Apple Music / TV+', price: 6.99, cur: 'USD', defaultCommission: 0.08 },
  { name: 'Mercado Libre Nivel 6', price: 4999, cur: 'ARS', defaultCommission: 0 }
];
