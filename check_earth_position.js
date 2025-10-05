// Quick check of Earth's position calculation
const epoch_j2000 = new Date('2000-01-01');
const test_date = new Date('2025-09-27');
const days_from_j2000 = (test_date - epoch_j2000) / (1000 * 60 * 60 * 24);

console.log('Test Date:', test_date.toISOString());
console.log('Days from J2000:', days_from_j2000);

// Earth orbital parameters
const earth_a = 1.0;
const earth_e = 0.017;
const earth_period = 365.25;
const earth_M0_degrees = 358.617;

console.log('\nEarth orbital parameters (at J2000.0):');
console.log('  Mean anomaly M0:', earth_M0_degrees, '°');

// Calculate mean anomaly at test date
const M0_rad = earth_M0_degrees * Math.PI / 180;
const M_rad = M0_rad + (days_from_j2000 * 2 * Math.PI / earth_period);
const M_deg = (M_rad * 180 / Math.PI) % 360;

console.log('  Mean anomaly at', test_date.toISOString().split('T')[0], ':', M_deg.toFixed(2), '°');

// Calculate eccentric anomaly
let E = M_rad;
for (let i = 0; i < 10; i++) {
    E = M_rad + earth_e * Math.sin(E);
}

// Calculate true anomaly
const nu = 2 * Math.atan2(
    Math.sqrt(1 + earth_e) * Math.sin(E / 2),
    Math.sqrt(1 - earth_e) * Math.cos(E / 2)
);

const nu_deg = (nu * 180 / Math.PI) % 360;
console.log('  True anomaly:', nu_deg.toFixed(2), '°');

// Calculate position
const r = earth_a * (1 - earth_e * Math.cos(E));
const x = r * Math.cos(nu);
const y = r * Math.sin(nu);

console.log('\nEarth position (heliocentric ecliptic):');
console.log('  x:', x.toFixed(6), 'AU');
console.log('  y:', y.toFixed(6), 'AU');
console.log('  r:', r.toFixed(6), 'AU');

// What date should Earth be at for Sept 27?
// Sept 27 is day 270 of the year (roughly)
// At J2000 (Jan 1, 2000), M0 = 358.617°
// Earth should be at ~180° (opposite side) in late September
console.log('\nExpected for late September (day ~270):');
console.log('  Should be approximately 180° around orbit from January 1');
console.log('  True anomaly should be around 180-200°');
