// Check asteroid position calculation
const close_approach_date = new Date('2025-09-27');
const epoch_jd = 2461000.5;
const epoch_date = new Date((epoch_jd - 2440587.5) * 86400000);

console.log('Close approach date:', close_approach_date.toISOString());
console.log('Orbital elements epoch:', epoch_date.toISOString());

const days_diff = (close_approach_date - epoch_date) / (1000 * 60 * 60 * 24);
console.log('Days from epoch:', days_diff.toFixed(2), '(NEGATIVE = extrapolating backwards!)');

// Asteroid: 2009 DO111
const M0_deg = 113.5762333440321;
const period = 393.533951972213;

console.log('\nAsteroid 2009 DO111:');
console.log('  Mean anomaly at epoch (Nov 21):', M0_deg.toFixed(2), '°');

// Calculate mean anomaly at close approach (going backwards 55 days)
const M0_rad = M0_deg * Math.PI / 180;
const M_rad = M0_rad + (days_diff * 2 * Math.PI / period);
const M_deg = ((M_rad * 180 / Math.PI) % 360 + 360) % 360;

console.log('  Mean anomaly at Sept 27:', M_deg.toFixed(2), '°');
console.log('  Change:', (M_deg - M0_deg).toFixed(2), '°');

console.log('\nPROBLEM: The orbital elements are osculating elements at Nov 21,');
console.log('but the close approach is Sept 27 (55 days earlier).');
console.log('Propagating backwards accumulates error from planetary perturbations.');
