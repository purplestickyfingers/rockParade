// Test orbital calculations against actual NASA data
const API_KEY = 'QnjB1SuXKjaFibxhV3rVmUcqxzHsKB80hSAWncBO';

// Calculate position from orbital elements (simplified 2D)
function calculateOrbitalPosition(a, e, M, omega = 0) {
    // Convert mean anomaly to eccentric anomaly (using Newton's method)
    let E = M;
    for (let i = 0; i < 10; i++) {
        E = M + e * Math.sin(E);
    }

    // Calculate true anomaly
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Calculate distance
    const r = a * (1 - e * Math.cos(E));

    // Position in orbital plane
    const x = r * Math.cos(nu + omega);
    const y = r * Math.sin(nu + omega);

    return { x, y, r };
}

async function testAsteroidPositions() {
    console.log('Testing asteroid orbital calculations...\n');

    // Load events
    const eventsResp = await fetch('events.json');
    const eventsData = await eventsResp.json();

    // Test first 3 asteroids
    for (let i = 0; i < Math.min(3, eventsData.events.length); i++) {
        const event = eventsData.events[i];
        console.log(`\n=== ${event.name} ===`);
        console.log(`Close approach date: ${event.date}`);
        console.log(`Expected miss distance: ${event.miss_distance_lunar.toFixed(2)} LD`);

        // Fetch orbital data
        const orbitalResp = await fetch(
            `https://api.nasa.gov/neo/rest/v1/neo/${event.neo_reference_id}?api_key=${API_KEY}`
        );
        const orbitalData = await orbitalResp.json();

        if (!orbitalData.orbital_data) {
            console.log('No orbital data available');
            continue;
        }

        const od = orbitalData.orbital_data;
        console.log(`Orbital elements:`);
        console.log(`  Semi-major axis: ${od.semi_major_axis} AU`);
        console.log(`  Eccentricity: ${od.eccentricity}`);
        console.log(`  Mean anomaly: ${od.mean_anomaly}°`);
        console.log(`  Perihelion arg: ${od.perihelion_argument}°`);

        // Calculate position at close approach date
        const closeApproachDate = new Date(event.date);
        const daysFromEpoch = (closeApproachDate.getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24);

        const a = parseFloat(od.semi_major_axis);
        const e = parseFloat(od.eccentricity);
        const M0 = parseFloat(od.mean_anomaly) * Math.PI / 180;
        const omega = parseFloat(od.perihelion_argument) * Math.PI / 180;
        const period = parseFloat(od.orbital_period);

        // Calculate mean anomaly at close approach
        const M = M0 + (daysFromEpoch * 2 * Math.PI / period);

        // Calculate asteroid position
        const asteroidPos = calculateOrbitalPosition(a, e, M, omega);

        // Calculate Earth position (simplified - assume circular orbit)
        const earthA = 1.0;
        const earthE = 0.017;
        const earthM0 = 358.617 * Math.PI / 180;
        const earthPeriod = 365.25;
        const earthM = earthM0 + (daysFromEpoch * 2 * Math.PI / earthPeriod);
        const earthPos = calculateOrbitalPosition(earthA, earthE, earthM);

        // Calculate distance
        const dx = asteroidPos.x - earthPos.x;
        const dy = asteroidPos.y - earthPos.y;
        const distanceAU = Math.sqrt(dx * dx + dy * dy);
        const distanceKm = distanceAU * 149597870.7;
        const distanceLD = distanceKm / 384400;

        console.log(`\nCalculated:`);
        console.log(`  Asteroid position: (${asteroidPos.x.toFixed(3)}, ${asteroidPos.y.toFixed(3)}) AU`);
        console.log(`  Earth position: (${earthPos.x.toFixed(3)}, ${earthPos.y.toFixed(3)}) AU`);
        console.log(`  Distance: ${distanceLD.toFixed(2)} LD`);
        console.log(`  Error: ${Math.abs(distanceLD - event.miss_distance_lunar).toFixed(2)} LD`);

        if (Math.abs(distanceLD - event.miss_distance_lunar) > 10) {
            console.log(`  ⚠️  LARGE ERROR - orbital calculation doesn't match close approach data`);
        } else {
            console.log(`  ✓ Close match`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

// Run test
testAsteroidPositions().catch(console.error);
