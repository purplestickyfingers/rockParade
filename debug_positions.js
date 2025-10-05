// Debug: Check what dates we're actually using

// First asteroid from events
const asteroid1 = {
    name: "(2009 DO111)",
    closeApproachDate: new Date('2025-09-27'),
    expectedDistance: 49.04 // LD
};

// Simulation date range
const startDate = new Date('2025-09-20'); // 1 week before first event
const currentOffset = 7; // 7 days into simulation
const currentDate = new Date(startDate.getTime() + currentOffset * 24 * 60 * 60 * 1000);

console.log('Asteroid:', asteroid1.name);
console.log('Close approach date:', asteroid1.closeApproachDate.toISOString().split('T')[0]);
console.log('Current simulation date:', currentDate.toISOString().split('T')[0]);
console.log('Match:', currentDate.getTime() === asteroid1.closeApproachDate.getTime());

// Orbital elements epoch
const epoch_jd = 2461000.5;
const epoch_date = new Date((epoch_jd - 2440587.5) * 86400000);

console.log('\nEpoch for orbital elements:', epoch_date.toISOString().split('T')[0]);
console.log('Days from epoch to close approach:', 
    ((asteroid1.closeApproachDate - epoch_date) / (1000 * 60 * 60 * 24)).toFixed(1));

console.log('\nEarth calculation:');
const j2000 = new Date('2000-01-01');
const daysFromJ2000 = (currentDate - j2000) / (1000 * 60 * 60 * 24);
console.log('Using J2000 epoch (Jan 1, 2000)');
console.log('Days from J2000 to', currentDate.toISOString().split('T')[0], ':', daysFromJ2000.toFixed(1));

console.log('\nAsteroid calculation:');
const daysFromAsteroidEpoch = (currentDate - epoch_date) / (1000 * 60 * 60 * 24);
console.log('Using epoch:', epoch_date.toISOString().split('T')[0]);
console.log('Days from epoch to', currentDate.toISOString().split('T')[0], ':', daysFromAsteroidEpoch.toFixed(1));

console.log('\n⚠️  ISSUE: Both Earth and asteroid should use THE SAME DATE for comparison!');
console.log('We ARE using the same currentDate for both, so that part is correct.');
console.log('The epochs are different (J2000 vs Nov 2025) but that should be OK.');
