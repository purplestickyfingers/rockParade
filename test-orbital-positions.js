// Unit test for orbital position calculations
const API_KEY = 'QnjB1SuXKjaFibxhV3rVmUcqxzHsKB80hSAWncBO';

const LUNAR_DISTANCE_KM = 384400;
const KM_PER_AU = 149597870.7;

// Calculate position from orbital elements (full 3D)
function calculateOrbitalPosition3D(a, e, M, omega = 0, i = 0, Omega = 0) {
    // Convert mean anomaly to eccentric anomaly (using Newton's method)
    let E = M;
    for (let iter = 0; iter < 10; iter++) {
        E = M + e * Math.sin(E);
    }

    // Calculate true anomaly
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Calculate distance from Sun
    const r = a * (1 - e * Math.cos(E));

    // Position in orbital plane (perifocal coordinates)
    const x_peri = r * Math.cos(nu);
    const y_peri = r * Math.sin(nu);

    // Rotate to ecliptic coordinates (3D)
    // Apply three rotations: omega (argument of perihelion), i (inclination), Omega (longitude of ascending node)
    const cos_omega = Math.cos(omega);
    const sin_omega = Math.sin(omega);
    const cos_i = Math.cos(i);
    const sin_i = Math.sin(i);
    const cos_Omega = Math.cos(Omega);
    const sin_Omega = Math.sin(Omega);

    // Standard transformation from perifocal to ecliptic coordinates
    const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_peri
            + (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_peri;

    const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_peri
            + (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_peri;

    const z = (sin_i * sin_omega) * x_peri + (sin_i * cos_omega) * y_peri;

    return { x, y, z, r };
}

// 2D version for backward compatibility
function calculateOrbitalPosition(a, e, M, omega = 0) {
    const pos3d = calculateOrbitalPosition3D(a, e, M, omega, 0, 0);
    return { x: pos3d.x, y: pos3d.y, r: pos3d.r };
}

async function runTests() {
    console.log('='.repeat(80));
    console.log('ORBITAL POSITION UNIT TESTS');
    console.log('='.repeat(80));

    // Load events data
    const eventsResp = await fetch('events.json');
    const eventsData = await eventsResp.json();

    // Load orbital data
    const orbitalResp = await fetch('orbital_data.json');
    const orbitalDataMap = await orbitalResp.json();

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Earth orbital parameters
    const earthParams = {
        a: 1.0,
        e: 0.017,
        period: 365.25,
        M0: 358.617 // degrees
    };

    // Test first 5 asteroids
    const testCount = Math.min(5, eventsData.events.length);

    for (let i = 0; i < testCount; i++) {
        const event = eventsData.events[i];
        const orbitalInfo = orbitalDataMap[event.neo_reference_id];

        if (!orbitalInfo) {
            console.log(`\n❌ SKIP: ${event.name} - No orbital data`);
            continue;
        }

        console.log('\n' + '-'.repeat(80));
        console.log(`TEST ${i + 1}: ${event.name}`);
        console.log('-'.repeat(80));

        totalTests++;

        const closeApproachDate = new Date(event.date);
        const expectedDistanceLD = event.miss_distance_lunar;

        console.log(`Close approach date: ${closeApproachDate.toISOString()}`);
        console.log(`Expected miss distance: ${expectedDistanceLD.toFixed(2)} LD`);
        console.log(`\nOrbital Elements:`);
        console.log(`  Semi-major axis: ${orbitalInfo.semi_major_axis} AU`);
        console.log(`  Eccentricity: ${orbitalInfo.eccentricity}`);
        console.log(`  Mean anomaly: ${orbitalInfo.mean_anomaly}°`);
        console.log(`  Perihelion arg: ${orbitalInfo.perihelion_argument}°`);
        console.log(`  Orbital period: ${orbitalInfo.orbital_period} days`);
        console.log(`  Inclination: ${orbitalInfo.inclination}°`);
        console.log(`  Epoch: ${orbitalInfo.epoch_osculation} JD`);

        // Convert Julian Date epoch to calendar date
        // JD 2461000.5 = September 26, 2025
        const julianEpoch = parseFloat(orbitalInfo.epoch_osculation);
        const epochDate = new Date((julianEpoch - 2440587.5) * 86400000); // Convert JD to Unix timestamp

        console.log(`  Epoch date: ${epochDate.toISOString()}`);

        // Calculate days from the orbital element epoch
        const daysFromEpoch = (closeApproachDate - epochDate) / (1000 * 60 * 60 * 24);

        console.log(`\nDays from epoch: ${daysFromEpoch.toFixed(2)}`);

        // Calculate asteroid position (3D)
        const asteroidM0 = orbitalInfo.mean_anomaly * Math.PI / 180;
        const asteroidM = asteroidM0 + (daysFromEpoch * 2 * Math.PI / orbitalInfo.orbital_period);
        const asteroidOmega = orbitalInfo.perihelion_argument * Math.PI / 180;
        const asteroidI = orbitalInfo.inclination * Math.PI / 180;
        const asteroidOmegaNode = orbitalInfo.ascending_node_longitude * Math.PI / 180;

        const asteroidPos = calculateOrbitalPosition3D(
            orbitalInfo.semi_major_axis,
            orbitalInfo.eccentricity,
            asteroidM,
            asteroidOmega,
            asteroidI,
            asteroidOmegaNode
        );

        console.log(`\nAsteroid position (3D):`);
        console.log(`  x = ${asteroidPos.x.toFixed(6)} AU`);
        console.log(`  y = ${asteroidPos.y.toFixed(6)} AU`);
        console.log(`  z = ${asteroidPos.z.toFixed(6)} AU`);
        console.log(`  r (from Sun) = ${asteroidPos.r.toFixed(6)} AU`);

        // Calculate Earth position
        const earthM0 = earthParams.M0 * Math.PI / 180;
        const earthM = earthM0 + (daysFromEpoch * 2 * Math.PI / earthParams.period);

        const earthPos = calculateOrbitalPosition3D(
            earthParams.a,
            earthParams.e,
            earthM,
            0, 0, 0  // Earth has negligible inclination relative to ecliptic
        );

        console.log(`\nEarth position (3D):`);
        console.log(`  x = ${earthPos.x.toFixed(6)} AU`);
        console.log(`  y = ${earthPos.y.toFixed(6)} AU`);
        console.log(`  z = ${earthPos.z.toFixed(6)} AU`);
        console.log(`  r (from Sun) = ${earthPos.r.toFixed(6)} AU`);

        // Calculate distance between asteroid and Earth (3D)
        const dx = asteroidPos.x - earthPos.x;
        const dy = asteroidPos.y - earthPos.y;
        const dz = asteroidPos.z - earthPos.z;
        const distance3D_AU = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const distance3D_km = distance3D_AU * KM_PER_AU;
        const distance3D_LD = distance3D_km / LUNAR_DISTANCE_KM;

        console.log(`\nCalculated distance (3D):`);
        console.log(`  ${distance3D_AU.toFixed(6)} AU`);
        console.log(`  ${distance3D_km.toFixed(0)} km`);
        console.log(`  ${distance3D_LD.toFixed(2)} LD`);

        const error_LD = Math.abs(distance3D_LD - expectedDistanceLD);
        const errorPercent = (error_LD / expectedDistanceLD) * 100;

        console.log(`\nComparison:`);
        console.log(`  Expected: ${expectedDistanceLD.toFixed(2)} LD`);
        console.log(`  Calculated: ${distance3D_LD.toFixed(2)} LD`);
        console.log(`  Error: ${error_LD.toFixed(2)} LD (${errorPercent.toFixed(1)}%)`);

        // Test passes if error is less than 10% (should be much better with 3D)
        const TOLERANCE_PERCENT = 10;

        if (errorPercent < TOLERANCE_PERCENT) {
            console.log(`\n✅ PASS - Error within ${TOLERANCE_PERCENT}% tolerance`);
            passedTests++;
        } else {
            console.log(`\n❌ FAIL - Error exceeds ${TOLERANCE_PERCENT}% tolerance`);
            console.log(`\n⚠️  POSSIBLE ISSUES:`);
            console.log(`   - Mean anomaly epoch may not match (using J2000.0)`);
            console.log(`   - Close approach time vs date (we're using midnight)`);
            console.log(`   - Orbital elements may have changed since epoch`);
            failedTests++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Pass rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
    console.log('\n' + '='.repeat(80));
    console.log('NOTES:');
    console.log('='.repeat(80));
    console.log('This test uses full 3D orbital mechanics including:');
    console.log('  ✓ Inclination (i) - tilt of orbit plane');
    console.log('  ✓ Longitude of ascending node (Ω) - rotation of orbit plane');
    console.log('  ✓ Full 3D position calculation (x, y, z)');
    console.log('');
    console.log('Small errors may occur due to:');
    console.log('  - Using date at midnight vs actual close approach time');
    console.log('  - Simplified 2-body problem (ignores planetary perturbations)');
    console.log('  - Mean anomaly epoch assumptions');
    console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);
