// Solar System Visualization using p5.js with real orbital mechanics
let showOrbitLines = true;
let showLabels = false;
let showAsteroids = true;
let asteroidData = [];
let time = 0;
let zoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Time window controls
let startDate = null;
let endDate = null;
let currentDateOffset = -14; // Days from start date (starts 2 weeks before)
let isPlaying = false;

// Hover and interaction
let hoveredAsteroid = null;

// View mode and zoom animation
let isEarthCentered = false; // Start with sun-centered view
let zoomTransitionProgress = 0; // 0 = sun-centered, 1 = earth-centered
const ZOOM_TRANSITION_DURATION = 15; // frames (0.5s at 30fps)

// Earth-centered view at 200 LD
const LUNAR_DISTANCE_KM = 384400;
const KM_PER_AU = 149597870.7;
const VIEW_RADIUS_LD = 200; // Show 200 lunar distances radius
const VIEW_RADIUS_AU = (VIEW_RADIUS_LD * LUNAR_DISTANCE_KM) / KM_PER_AU;
let AU_SCALE = 120; // Pixels per AU (will be recalculated)
let AU_SCALE_WIDE = 120; // For sun-centered view (shows Mars)
let AU_SCALE_CLOSE = 120; // For earth-centered view (200 LD)

const API_KEY = 'QnjB1SuXKjaFibxhV3rVmUcqxzHsKB80hSAWncBO';

// Solar system data (distances in AU, sizes scaled for visibility)
// M0 and omega values are for J2000.0 epoch (Jan 1, 2000, 12:00 TT)
const planets = [
    { name: 'Mercury', a: 0.387, e: 0.206, size: 4, color: '#8c7853', period: 88, M0: 174.796, omega: 29.124 },
    { name: 'Venus', a: 0.723, e: 0.007, size: 9, color: '#ffc649', period: 225, M0: 50.115, omega: 54.884 },
    { name: 'Earth', a: 1.0, e: 0.017, size: 10, color: '#4a90e2', period: 365.25, M0: 358.617, omega: 102.937 },
    { name: 'Mars', a: 1.524, e: 0.093, size: 5, color: '#e27b58', period: 687, M0: 19.373, omega: 286.502 }
];

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

// 2D version for planets (backward compatibility)
function calculateOrbitalPosition(a, e, M, omega = 0) {
    const pos3d = calculateOrbitalPosition3D(a, e, M, omega, 0, 0);
    return { x: pos3d.x, y: pos3d.y, r: pos3d.r };
}

// p5.js sketch
const sketch = function(p) {
    p.setup = function() {
        const width = Math.min(1160, window.innerWidth - 80);
        const height = 700;
        const canvas = p.createCanvas(width, height);
        canvas.parent('solar-system-canvas');
        p.frameRate(30);

        // Calculate AU_SCALE for both views
        const viewSize = Math.min(width, height) * 0.9;

        // Wide view: show out to Mars orbit (~2 AU radius)
        AU_SCALE_WIDE = viewSize / 4; // Show -2 to +2 AU (4 AU total)

        // Close view: Earth-centered at 200 LD radius
        AU_SCALE_CLOSE = viewSize / (VIEW_RADIUS_AU * 2); // Diameter = 2 * radius

        // Start with wide view
        AU_SCALE = AU_SCALE_WIDE;

        console.log('Solar system canvas created:', width, 'x', height);
        console.log(`Wide view AU_SCALE: ${AU_SCALE_WIDE.toFixed(1)} pixels per AU`);
        console.log(`Close view AU_SCALE: ${AU_SCALE_CLOSE.toFixed(1)} pixels per AU`);

        // Load asteroid data
        loadAsteroidData();
    };

    p.draw = function() {
        // Background - deep space
        p.background(5, 8, 20);

        // Current date for orbital calculations
        const currentDate = startDate ? new Date(startDate.getTime() + currentDateOffset * 24 * 60 * 60 * 1000) : null;

        // Calculate Earth's position first for parallax
        let earthPos = null;
        const earthPlanet = planets.find(p => p.name === 'Earth');
        if (earthPlanet && currentDate) {
            const epoch = new Date('2000-01-01');
            const daysFromEpoch = (currentDate - epoch) / (1000 * 60 * 60 * 24);
            const M0 = earthPlanet.M0 * p.PI / 180;
            const M = M0 + (daysFromEpoch * 2 * p.PI / earthPlanet.period);
            const omega = earthPlanet.omega * p.PI / 180;
            const pos = calculateOrbitalPosition(earthPlanet.a, earthPlanet.e, M, omega);
            earthPos = { x: pos.x * AU_SCALE, y: pos.y * AU_SCALE };
        }

        // Add parallax starfield - stars move slowly with Earth's motion
        p.randomSeed(42);
        for (let i = 0; i < 200; i++) {
            const baseX = p.random(p.width);
            const baseY = p.random(p.height);

            // Parallax effect: distant stars move very slowly with Earth
            const parallaxFactor = 0.02; // Stars are "infinitely" far away
            const sx = baseX - (earthPos ? earthPos.x * parallaxFactor : 0);
            const sy = baseY - (earthPos ? earthPos.y * parallaxFactor : 0);

            // Wrap stars around the screen
            const wrappedX = ((sx % p.width) + p.width) % p.width;
            const wrappedY = ((sy % p.height) + p.height) % p.height;

            const brightness = p.random(100, 255);
            p.stroke(brightness);
            p.strokeWeight(p.random(1, 2));
            p.point(wrappedX, wrappedY);
        }

        // Handle zoom transition when play is pressed
        if (isPlaying && !isEarthCentered && zoomTransitionProgress < 1) {
            zoomTransitionProgress += 1 / ZOOM_TRANSITION_DURATION;
            if (zoomTransitionProgress >= 1) {
                zoomTransitionProgress = 1;
                isEarthCentered = true;
            }
        }

        // Interpolate between wide and close AU_SCALE using easeInOutCubic
        const t = zoomTransitionProgress;
        const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        AU_SCALE = AU_SCALE_WIDE + (AU_SCALE_CLOSE - AU_SCALE_WIDE) * easedT;

        // Calculate current simulation time based on date offset
        if (isPlaying && startDate && endDate) {
            const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
            currentDateOffset += 0.1; // Advance by 0.1 days per frame
            if (currentDateOffset > totalDays) currentDateOffset = 0; // Loop
        }

        // Transform to center view
        p.push();
        if (isEarthCentered && earthPos) {
            // Earth-centered view: keep Earth in the middle
            p.translate(p.width / 2 - earthPos.x * zoom + offsetX, p.height / 2 - earthPos.y * zoom + offsetY);
        } else if (zoomTransitionProgress > 0 && zoomTransitionProgress < 1 && earthPos) {
            // During transition: interpolate from sun-centered to earth-centered
            const sunCenterX = p.width / 2 + offsetX;
            const sunCenterY = p.height / 2 + offsetY;
            const earthCenterX = p.width / 2 - earthPos.x * zoom + offsetX;
            const earthCenterY = p.height / 2 - earthPos.y * zoom + offsetY;
            p.translate(
                sunCenterX + (earthCenterX - sunCenterX) * easedT,
                sunCenterY + (earthCenterY - sunCenterY) * easedT
            );
        } else {
            // Sun-centered view
            p.translate(p.width / 2 + offsetX, p.height / 2 + offsetY);
        }
        p.scale(zoom);

        // Draw Sun (will be off-center now since we're Earth-centered)
        p.noStroke();
        p.fill(255, 200, 50);
        p.circle(0, 0, 30);

        // Add sun glow
        for (let i = 3; i > 0; i--) {
            p.fill(255, 200, 50, 20);
            p.circle(0, 0, 30 + i * 15);
        }

        // Draw planet orbits and planets
        planets.forEach(planet => {
            // Draw orbit ellipse
            if (showOrbitLines) {
                p.push();
                p.noFill();
                p.stroke(255, 255, 255, 100);
                p.strokeWeight(2);

                // Draw ellipse
                const a = planet.a * AU_SCALE;
                const b = planet.a * Math.sqrt(1 - planet.e * planet.e) * AU_SCALE;
                const c = planet.a * planet.e * AU_SCALE;

                p.translate(-c, 0);
                p.ellipse(0, 0, a * 2, b * 2);
                p.pop();
            }

            // Calculate planet position using orbital mechanics (J2000.0 epoch)
            if (currentDate) {
                const epoch = new Date('2000-01-01');
                const daysFromEpoch = (currentDate - epoch) / (1000 * 60 * 60 * 24);
                const M0 = planet.M0 * p.PI / 180;
                const M = M0 + (daysFromEpoch * 2 * p.PI / planet.period);
                const omega = (planet.omega || 0) * p.PI / 180;
                const pos = calculateOrbitalPosition(planet.a, planet.e, M, omega);

                const px = pos.x * AU_SCALE;
                const py = pos.y * AU_SCALE;

                // Draw planet
                p.noStroke();
                const planetColor = p.color(planet.color);
                planetColor.setAlpha(180);
                p.fill(planetColor);
                p.circle(px, py, planet.size);

                // Draw label (always show for planets)
                p.fill(255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(10);
                p.text(planet.name, px, py + planet.size + 12);
            }
        });

        // Draw distance circles from Earth (every 50 LD up to 200)
        if (earthPos) {
            p.push();
            p.noFill();
            p.strokeWeight(1);

            // Draw circles at 50, 100, 150, 200 lunar distances
            for (let ld = 50; ld <= 200; ld += 50) {
                const distanceKm = ld * LUNAR_DISTANCE_KM;
                const distanceAU = distanceKm / KM_PER_AU;
                const radiusPixels = distanceAU * AU_SCALE;

                // Color gets fainter with distance
                const alpha = 80 - (ld / 50) * 10;
                p.stroke(100, 200, 255, alpha);
                p.circle(earthPos.x, earthPos.y, radiusPixels * 2);

                // Label the circle (always visible)
                p.fill(100, 200, 255, alpha + 60);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(10);
                p.text(`${ld} LD`, earthPos.x + radiusPixels, earthPos.y);
            }
            p.pop();
        }

        // Draw asteroids
        if (showAsteroids && asteroidData.length > 0) {
            asteroidData.forEach((asteroid, idx) => {
                if (!asteroid.orbit) return;

                const orbit = asteroid.orbit;

                // Calculate asteroid position - use close approach data when near Earth
                let ax, ay;

                if (currentDate && asteroid.closeApproachDate && asteroid.missDistanceLunar && earthPos) {
                    const timeDiff = currentDate - asteroid.closeApproachDate;
                    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

                    // Within ±5 days of close approach: position at actual miss distance from Earth
                    if (Math.abs(daysDiff) <= 5) {
                        const missDistanceAU = (asteroid.missDistanceLunar * LUNAR_DISTANCE_KM) / KM_PER_AU;
                        const distancePixels = missDistanceAU * AU_SCALE;

                        // Use a consistent angle for each asteroid based on its index
                        // This creates a "flyby" pattern around Earth
                        const t = daysDiff / 5; // -1 to +1
                        const baseAngle = (idx * 137.5) * p.PI / 180; // Golden angle spacing
                        const flybyAngle = baseAngle + t * 0.5; // Sweep angle during flyby

                        ax = earthPos.x + distancePixels * Math.cos(flybyAngle);
                        ay = earthPos.y + distancePixels * Math.sin(flybyAngle);
                    } else {
                        // Outside close approach: use orbital elements (with epoch correction)
                        const julianEpoch = parseFloat(orbit.epoch || 2461000.5);
                        const epochDate = new Date((julianEpoch - 2440587.5) * 86400000);

                        // Adjust M0 from epoch to close approach date, then to current date
                        const epochToCloseApproach = (asteroid.closeApproachDate - epochDate) / (1000 * 60 * 60 * 24);
                        const M0_at_epoch = orbit.M0 * p.PI / 180;
                        const M0_at_close_approach = M0_at_epoch + (epochToCloseApproach * 2 * p.PI / orbit.period);
                        const M = M0_at_close_approach + (daysDiff * 2 * p.PI / orbit.period);

                        const omega = orbit.omega * p.PI / 180;
                        const i = orbit.inclination * p.PI / 180;
                        const Omega = (orbit.ascendingNode || 0) * p.PI / 180;

                        const orbitPos = calculateOrbitalPosition3D(orbit.a, orbit.e, M, omega, i, Omega);
                        ax = orbitPos.x * AU_SCALE;
                        ay = orbitPos.y * AU_SCALE;
                    }
                } else {
                    // No close approach data: use orbital elements only
                    const julianEpoch = parseFloat(orbit.epoch || 2461000.5);
                    const epochDate = new Date((julianEpoch - 2440587.5) * 86400000);
                    const daysFromEpoch = currentDate ? (currentDate - epochDate) / (1000 * 60 * 60 * 24) : 0;

                    const M0 = orbit.M0 * p.PI / 180;
                    const M = M0 + (daysFromEpoch * 2 * p.PI / orbit.period);
                    const omega = orbit.omega * p.PI / 180;
                    const i = orbit.inclination * p.PI / 180;
                    const Omega = (orbit.ascendingNode || 0) * p.PI / 180;

                    const orbitPos = calculateOrbitalPosition3D(orbit.a, orbit.e, M, omega, i, Omega);
                    ax = orbitPos.x * AU_SCALE;
                    ay = orbitPos.y * AU_SCALE;
                }

                // Store asteroid screen position for hover detection
                asteroid.screenX = ax;
                asteroid.screenY = ay;

                // Only draw if within reasonable bounds
                if (Math.abs(ax) < 1000 && Math.abs(ay) < 1000) {
                    // Check if asteroid is within 2 days of close approach
                    let isNearApproach = false;
                    if (currentDate && asteroid.closeApproachDate && earthPos) {
                        const timeDiff = Math.abs(currentDate - asteroid.closeApproachDate);
                        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
                        isNearApproach = daysDiff <= 2;

                        // Debug: show actual distance vs expected for close approaches
                        if (isNearApproach && idx === 0) {
                            const distToEarth = Math.sqrt(Math.pow(ax - earthPos.x, 2) + Math.pow(ay - earthPos.y, 2));
                            const distInAU = distToEarth / AU_SCALE;
                            const distInLD = (distInAU * 149597870.7) / 384400;
                            console.log(`${asteroid.name}: Calculated=${distInLD.toFixed(1)} LD, Expected=${asteroid.missDistanceLunar?.toFixed(1)} LD`);
                        }

                        // Draw zap line from Earth to asteroid
                        if (isNearApproach) {
                            p.push();
                            // Animated glowing effect
                            const glowPhase = (p.frameCount % 30) / 30;

                            // Multiple lines for glow effect
                            for (let i = 3; i >= 0; i--) {
                                const alpha = (80 - i * 20) * (0.5 + 0.5 * Math.sin(glowPhase * p.TWO_PI));
                                p.stroke(0, 255, 100, alpha);
                                p.strokeWeight(3 - i * 0.5);
                                p.line(earthPos.x, earthPos.y, ax, ay);
                            }

                            // Core bright line
                            p.stroke(150, 255, 150, 200);
                            p.strokeWeight(1);
                            p.line(earthPos.x, earthPos.y, ax, ay);
                            p.pop();
                        }
                    }

                    // Color based on hazard level and approach status
                    if (isNearApproach) {
                        // Pulsing effect during close approach
                        const pulse = 0.7 + 0.3 * Math.sin((p.frameCount % 30) / 30 * p.TWO_PI);
                        if (asteroid.is_hazardous) {
                            p.fill(220 * pulse, 47, 2, 200);
                        } else {
                            p.fill(0, 255 * pulse, 100, 200);
                        }
                    } else if (asteroid.is_hazardous) {
                        p.fill(220, 47, 2, 150);
                    } else {
                        p.fill(255, 214, 10, 150);
                    }

                    p.noStroke();
                    p.circle(ax, ay, isNearApproach ? 6 : 4);

                    // Show label for all asteroids if labels enabled, or just first 3, or if near approach
                    const shouldShowLabel = showLabels || idx < 3 || isNearApproach;
                    if (shouldShowLabel) {
                        if (isNearApproach) {
                            p.fill(0, 255, 100);
                        } else {
                            p.fill(asteroid.is_hazardous ? p.color(220, 47, 2) : p.color(255, 214, 10));
                        }
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textSize(isNearApproach ? 11 : 9);
                        p.textStyle(isNearApproach ? p.BOLD : p.NORMAL);
                        const name = asteroid.name.replace(/[()]/g, '').substring(0, 12);
                        p.text(name, ax, ay - (isNearApproach ? 12 : 10));

                        // Show "CLOSE APPROACH" label
                        if (isNearApproach) {
                            p.textSize(8);
                            p.fill(0, 255, 100);
                            p.text('CLOSE APPROACH', ax, ay + 15);
                        }
                    }
                }
            });
        }

        p.pop();

        // Check for asteroid hover (in screen coordinates)
        hoveredAsteroid = null;
        if (asteroidData.length > 0) {
            // Get mouse position in transformed space
            const transformedMouseX = (p.mouseX - p.width / 2) / zoom;
            const transformedMouseY = (p.mouseY - p.height / 2) / zoom;

            // Adjust for view offset
            let mouseWorldX, mouseWorldY;
            if (isEarthCentered && earthPos) {
                mouseWorldX = transformedMouseX + earthPos.x;
                mouseWorldY = transformedMouseY + earthPos.y;
            } else if (zoomTransitionProgress > 0 && zoomTransitionProgress < 1 && earthPos) {
                const t = zoomTransitionProgress;
                const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                const offsetAdjustX = earthPos.x * easedT;
                const offsetAdjustY = earthPos.y * easedT;
                mouseWorldX = transformedMouseX + offsetAdjustX;
                mouseWorldY = transformedMouseY + offsetAdjustY;
            } else {
                mouseWorldX = transformedMouseX;
                mouseWorldY = transformedMouseY;
            }

            asteroidData.forEach(asteroid => {
                if (asteroid.screenX !== undefined && asteroid.screenY !== undefined) {
                    const dx = asteroid.screenX - mouseWorldX;
                    const dy = asteroid.screenY - mouseWorldY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const hoverRadius = 10 / zoom; // Adjust for zoom

                    if (distance < hoverRadius) {
                        hoveredAsteroid = asteroid;
                    }
                }
            });
        }

        // Draw hover tooltip
        if (hoveredAsteroid) {
            p.push();
            p.fill(0, 0, 0, 220);
            p.noStroke();
            const tooltipWidth = 200;
            const tooltipHeight = 60;
            const tooltipX = Math.min(p.mouseX + 10, p.width - tooltipWidth - 10);
            const tooltipY = Math.max(p.mouseY - tooltipHeight - 10, 10);
            p.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);

            p.fill(255);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.textStyle(p.BOLD);
            p.text(hoveredAsteroid.name, tooltipX + 10, tooltipY + 10);

            p.textStyle(p.NORMAL);
            p.textSize(10);
            if (hoveredAsteroid.closeApproachDate) {
                const dateStr = hoveredAsteroid.closeApproachDate.toISOString().split('T')[0];
                p.text(`Close approach: ${dateStr}`, tooltipX + 10, tooltipY + 30);
            }
            if (hoveredAsteroid.missDistanceLunar) {
                p.text(`Distance: ${hoveredAsteroid.missDistanceLunar.toFixed(2)} LD`, tooltipX + 10, tooltipY + 45);
            }

            // Change cursor
            p.cursor(p.HAND);
            p.pop();
        } else {
            p.cursor(p.ARROW);
        }

        // Draw legend
        drawLegend(p);

        // Draw interaction hints
        drawHints(p);

        // Draw date display
        drawDateDisplay(p);
    };

    function drawLegend(p) {
        p.push();
        p.fill(0, 0, 0, 180);
        p.noStroke();
        p.rect(10, 10, 200, showAsteroids ? 140 : 90, 10);

        p.fill(255);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(12);
        p.text('Solar System Legend', 20, 20);

        // Sun
        p.fill(255, 200, 50);
        p.circle(30, 50, 12);
        p.fill(255);
        p.text('Sun', 50, 44);

        // Earth
        p.fill(74, 144, 226);
        p.circle(30, 70, 10);
        p.fill(255);
        p.text('Planets', 50, 64);

        if (showAsteroids) {
            // Hazardous asteroid
            p.fill(220, 47, 2);
            p.circle(30, 90, 6);
            p.fill(255);
            p.text('Hazardous Asteroid', 50, 84);

            // Normal asteroid
            p.fill(255, 214, 10);
            p.circle(30, 110, 6);
            p.fill(255);
            p.text('Near-Earth Asteroid', 50, 104);

            // Loading status
            const loadedCount = asteroidData.filter(a => a.orbit).length;
            p.fill(200);
            p.textSize(9);
            p.text(`${loadedCount}/${asteroidData.length} orbits loaded`, 20, 130);
        }

        p.pop();
    }

    function drawHints(p) {
        p.push();
        p.fill(0, 0, 0, 180);
        p.noStroke();
        p.rect(p.width - 210, 10, 200, 60, 10);

        p.fill(255);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(11);
        p.text('🖱️ Drag to pan', p.width - 200, 20);
        p.text('🔍 Scroll to zoom', p.width - 200, 38);
        p.text(`Zoom: ${zoom.toFixed(1)}x`, p.width - 200, 56);

        p.pop();
    }

    function drawDateDisplay(p) {
        if (!startDate || !endDate) return;

        p.push();
        p.fill(0, 0, 0, 180);
        p.noStroke();
        p.rect(p.width / 2 - 200, p.height - 70, 400, 60, 10);

        // Calculate current date
        const currentDate = new Date(startDate.getTime() + currentDateOffset * 24 * 60 * 60 * 1000);
        const dateStr = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        p.fill(255, 214, 10);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(16);
        p.text(dateStr, p.width / 2, p.height - 60);

        // Progress bar
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const progress = currentDateOffset / totalDays;
        p.fill(255, 255, 255, 50);
        p.rect(p.width / 2 - 180, p.height - 30, 360, 8, 4);
        p.fill(255, 214, 10);
        p.rect(p.width / 2 - 180, p.height - 30, 360 * progress, 8, 4);

        // Date range labels
        p.fill(200);
        p.textSize(10);
        p.textAlign(p.LEFT, p.TOP);
        const startDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        p.text(startDateStr, p.width / 2 - 180, p.height - 18);
        p.textAlign(p.RIGHT, p.TOP);
        p.text(endDateStr, p.width / 2 + 180, p.height - 18);

        p.pop();
    }

    // Mouse interaction
    let dragStartX = 0;
    let dragStartY = 0;
    let hasDragged = false;

    p.mousePressed = function() {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            isDragging = true;
            hasDragged = false;
            lastMouseX = p.mouseX;
            lastMouseY = p.mouseY;
            dragStartX = p.mouseX;
            dragStartY = p.mouseY;
            return false;
        }
    };

    p.mouseReleased = function() {
        // Check if this was a click (minimal movement) on an asteroid
        if (!hasDragged && hoveredAsteroid) {
            console.log('Click detected on asteroid');
            scrollToAsteroidInList(hoveredAsteroid);
        }
        isDragging = false;
        hasDragged = false;
    };

    p.mouseDragged = function() {
        if (isDragging) {
            const dragDistance = Math.sqrt(
                Math.pow(p.mouseX - dragStartX, 2) +
                Math.pow(p.mouseY - dragStartY, 2)
            );
            // If dragged more than 5 pixels, consider it a drag not a click
            if (dragDistance > 5) {
                hasDragged = true;
            }
            offsetX += (p.mouseX - lastMouseX);
            offsetY += (p.mouseY - lastMouseY);
            lastMouseX = p.mouseX;
            lastMouseY = p.mouseY;
            return false;
        }
    };

    p.mouseWheel = function(event) {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            const zoomFactor = 0.001;
            zoom -= event.delta * zoomFactor;
            zoom = p.constrain(zoom, 0.3, 3.0);
            return false; // Prevent page scroll
        }
    };
};

// Wait for DOM to be ready, then create p5 instance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        new p5(sketch);
        console.log('p5.js sketch initialized');
    });
} else {
    new p5(sketch);
    console.log('p5.js sketch initialized');
}

// Scroll to asteroid in the events list
function scrollToAsteroidInList(asteroid) {
    console.log('Scrolling to asteroid:', asteroid.name);

    // Find the asteroid card in the events list
    const eventFeed = document.getElementById('event-feed');
    if (!eventFeed) {
        console.log('Event feed not found');
        return;
    }

    // Find all event items
    const eventItems = eventFeed.querySelectorAll('.event');
    console.log('Found event items:', eventItems.length);

    for (const item of eventItems) {
        // Check if this item's name contains the asteroid name
        const nameEl = item.querySelector('.event-name');
        if (nameEl) {
            console.log('Checking:', nameEl.textContent, 'against', asteroid.name);
            if (nameEl.textContent.includes(asteroid.name)) {
                console.log('Found match! Scrolling...');
                // Scroll to this item
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight the item temporarily
                const originalBg = item.style.background;
                item.style.background = 'rgba(0, 255, 100, 0.3)';
                setTimeout(() => {
                    item.style.background = originalBg;
                }, 2000);

                break;
            }
        }
    }
}

// Load asteroid orbital data from NASA API
async function loadAsteroidData() {
    try {
        const response = await fetch('events.json');
        const data = await response.json();

        // Initialize asteroid data
        asteroidData = data.events.map(e => ({
            name: e.name,
            id: e.neo_reference_id,
            is_hazardous: e.is_hazardous,
            closeApproachDate: new Date(e.date),
            closeApproachTime: new Date(e.time), // Full timestamp
            missDistanceLunar: e.miss_distance_lunar, // Store the actual miss distance
            orbit: null
        }));

        console.log('Sample asteroid data:', asteroidData.slice(0, 2));

        // Set date range based on events (add 1 week on either side)
        if (data.events.length > 0) {
            const dates = data.events.map(e => new Date(e.date));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));

            // Add 1 week (7 days) margin on either side
            startDate = new Date(minDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Set initial offset to start of range (now -7 days from first event)
            currentDateOffset = 0;

            console.log(`Date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
        }

        console.log(`Loading pre-fetched orbital data for ${asteroidData.length} asteroids...`);

        // Load pre-fetched orbital data
        try {
            const orbitalResp = await fetch('orbital_data.json');
            const orbitalDataMap = await orbitalResp.json();

            asteroidData.forEach(asteroid => {
                const orbitalInfo = orbitalDataMap[asteroid.id];
                if (orbitalInfo) {
                    asteroid.orbit = {
                        a: orbitalInfo.semi_major_axis,
                        e: orbitalInfo.eccentricity,
                        omega: orbitalInfo.perihelion_argument,
                        M0: orbitalInfo.mean_anomaly,
                        period: orbitalInfo.orbital_period,
                        inclination: orbitalInfo.inclination,
                        ascendingNode: orbitalInfo.ascending_node_longitude,
                        epoch: orbitalInfo.epoch_osculation
                    };
                }
            });

            const loadedCount = asteroidData.filter(a => a.orbit).length;
            console.log(`Loaded ${loadedCount}/${asteroidData.length} orbital data sets`);
        } catch (error) {
            console.error('Failed to load pre-fetched orbital data:', error);
        }
    } catch (error) {
        console.error('Could not load asteroid data for visualization:', error);
    }
}

// Control buttons
document.addEventListener('DOMContentLoaded', function() {
    // Play/Pause
    document.getElementById('play-pause').addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
        this.classList.toggle('active');
    });

    // Toggle orbit lines
    document.getElementById('toggle-orbits').addEventListener('click', function() {
        showOrbitLines = !showOrbitLines;
        this.classList.toggle('active');
    });

    // Toggle labels
    document.getElementById('toggle-labels').addEventListener('click', function() {
        showLabels = !showLabels;
        this.classList.toggle('active');
    });

    // Toggle asteroids
    document.getElementById('toggle-asteroids').addEventListener('click', function() {
        showAsteroids = !showAsteroids;
        this.classList.toggle('active');
    });

    // Reset view
    document.getElementById('reset-view').addEventListener('click', function() {
        zoom = 1.0;
        offsetX = 0;
        offsetY = 0;
        currentDateOffset = 0;
        isPlaying = false;
        isEarthCentered = false;
        zoomTransitionProgress = 0;
        AU_SCALE = AU_SCALE_WIDE;
        const playBtn = document.getElementById('play-pause');
        playBtn.textContent = '▶ Play';
        playBtn.classList.remove('active');
    });
});
