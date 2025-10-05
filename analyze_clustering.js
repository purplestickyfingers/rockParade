// Analyze why all asteroids are clustered

const test_date = new Date('2025-09-27');
const epoch_jd = 2461000.5;
const epoch_date = new Date((epoch_jd - 2440587.5) * 86400000);

console.log('Test date:', test_date.toISOString().split('T')[0]);
console.log('Epoch date:', epoch_date.toISOString().split('T')[0]);

const days_diff = (test_date - epoch_date) / (1000 * 60 * 60 * 24);
console.log('Days difference:', days_diff);

// All asteroids from test results
const asteroids = [
    { name: '2009 DO111', x: 0.976701, y: 0.189911, M0: 113.58, period: 393.5 },
    { name: '2007 TR68', x: 1.080746, y: 0.027095, M0: 274.32, period: 299.5 },
    { name: '2013 ST19', x: 1.078374, y: -0.012048, M0: 0.55, period: 626.5 },
    { name: '2019 SF6', x: 1.037370, y: 0.115493, M0: 221.42, period: 243.1 },
    { name: '1998 FW4', x: 1.003626, y: 0.126237, M0: 2.25, period: 1461.3 }
];

console.log('\nAsteroid positions at Sept 27, 2025:');
asteroids.forEach(a => {
    const angle = Math.atan2(a.y, a.x) * 180 / Math.PI;
    const r = Math.sqrt(a.x * a.x + a.y * a.y);
    
    // Mean motion (degrees per day)
    const n = 360 / a.period;
    
    // Change in mean anomaly over -55 days
    const dM = n * days_diff;
    const M_sept27 = ((a.M0 + dM) % 360 + 360) % 360;
    
    console.log(`\n${a.name}:`);
    console.log(`  Position: (${a.x.toFixed(3)}, ${a.y.toFixed(3)})`);
    console.log(`  Angle from +X: ${angle.toFixed(1)}°`);
    console.log(`  Distance from Sun: ${r.toFixed(3)} AU`);
    console.log(`  M0 at epoch: ${a.M0.toFixed(1)}°`);
    console.log(`  M at Sept 27: ${M_sept27.toFixed(1)}°`);
});

console.log('\nEarth position: (0.536, -0.833)');
const earth_angle = Math.atan2(-0.833, 0.536) * 180 / Math.PI;
console.log('Earth angle from +X:', earth_angle.toFixed(1), '°');

console.log('\nOBSERVATION: All asteroids are clustered around 0-15° from +X axis');
console.log('Earth is at about -57° from +X axis');
console.log('This is about 60-75° apart!');

console.log('\nPossible issues:');
console.log('1. Are we using the right reference frame?');
console.log('2. Is there a perihelion/longitude offset?');
console.log('3. Are the orbital elements osculating or mean?');
