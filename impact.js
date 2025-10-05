// Impact crater and damage calculations

// Calculate crater diameter using various impact equations
function calculateCraterSize(asteroidDiameter, velocity, density = 2500) {
    // Convert diameter from meters to km
    const diameterKm = asteroidDiameter / 1000;

    // Convert velocity from km/h to km/s
    const velocityKmS = velocity / 3600;

    // Assumed asteroid density in kg/m^3 (2500 for rocky asteroid)
    const asteroidDensity = density;
    const targetDensity = 2500; // Earth's crust density

    // Energy calculation (kinetic energy in megatons TNT)
    const mass = (4/3) * Math.PI * Math.pow(diameterKm * 500, 3) * asteroidDensity; // mass in kg
    const energy = 0.5 * mass * Math.pow(velocityKmS * 1000, 2); // joules
    const energyMegatons = energy / (4.184 * Math.pow(10, 15)); // convert to megatons TNT

    // Crater diameter using simplified scaling law
    // D_crater ≈ 1.8 * D_asteroid * (ρ_asteroid/ρ_target)^(1/3) * v^0.44
    const craterDiameter = 1.8 * diameterKm *
                          Math.pow(asteroidDensity / targetDensity, 1/3) *
                          Math.pow(velocityKmS, 0.44);

    // Crater depth (typically 1/5 to 1/3 of diameter)
    const craterDepth = craterDiameter / 4;

    return {
        craterDiameterKm: craterDiameter,
        craterDepthKm: craterDepth,
        energyMegatons: energyMegatons,
        asteroidDiameterKm: diameterKm,
        velocityKmS: velocityKmS
    };
}

// Calculate damage zones (based on distance from impact)
function calculateDamageZones(craterDiameterKm, energyMegatons) {
    // Approximate damage radii based on impact energy
    // These are rough estimates based on nuclear weapon effects scaled up

    return {
        fireball: craterDiameterKm / 2, // radius of initial fireball
        vaporization: craterDiameterKm * 0.75, // everything vaporized
        totalDestruction: craterDiameterKm * 2, // complete destruction
        severeBlast: Math.sqrt(energyMegatons) * 5, // severe structural damage
        moderateBlast: Math.sqrt(energyMegatons) * 10, // moderate damage
        thermalRadiation: Math.sqrt(energyMegatons) * 15, // 3rd degree burns
        airblast: Math.sqrt(energyMegatons) * 25 // windows broken
    };
}

// Get damage description
function getDamageDescription(impact, zones) {
    const population = estimateAffectedPopulation(zones);

    return {
        immediate: `Crater ${impact.craterDiameterKm.toFixed(1)} km wide and ${impact.craterDepthKm.toFixed(2)} km deep. ` +
                  `Everything within ${zones.vaporization.toFixed(1)} km instantly vaporized.`,

        blast: `Total destruction within ${zones.totalDestruction.toFixed(1)} km. ` +
              `Severe structural damage up to ${zones.severeBlast.toFixed(0)} km. ` +
              `Moderate damage ${zones.moderateBlast.toFixed(0)} km from impact.`,

        thermal: `Thermal radiation causes 3rd degree burns up to ${zones.thermalRadiation.toFixed(0)} km away.`,

        airblast: `Windows shattered and minor damage up to ${zones.airblast.toFixed(0)} km from impact.`,

        energy: `Impact energy equivalent to ${impact.energyMegatons.toFixed(1)} megatons of TNT ` +
               `(${(impact.energyMegatons / 15).toFixed(0)}x the Hiroshima bomb).`,

        seismic: impact.energyMegatons > 100 ?
                `Magnitude ${(4 + Math.log10(impact.energyMegatons)).toFixed(1)} earthquake felt globally.` :
                `Magnitude ${(4 + Math.log10(impact.energyMegatons)).toFixed(1)} earthquake in the region.`,

        casualties: population
    };
}

function estimateAffectedPopulation(zones) {
    // Very rough estimate assuming urban density
    const urbanDensity = 1500; // people per km²
    const totalArea = Math.PI * Math.pow(zones.severeBlast, 2);
    const affected = totalArea * urbanDensity;

    if (affected > 1000000) {
        return `Potentially millions of casualties within ${zones.severeBlast.toFixed(0)} km radius.`;
    } else if (affected > 100000) {
        return `Hundreds of thousands potentially affected.`;
    } else {
        return `Tens of thousands potentially affected.`;
    }
}

// Create map visualization
function createImpactMap(zones, asteroidName) {
    // South Africa coordinates (Pretoria as center)
    const lat = -25.7479;
    const lon = 28.2293;

    // Store map data globally so we can initialize it after DOM is ready
    window.pendingMapData = {
        lat: lat,
        lon: lon,
        zones: zones,
        asteroidName: asteroidName
    };

    return `
        <div style="position: relative; width: 100%; height: 700px; background: #1a1a2e; border-radius: 15px; overflow: hidden;">
            <div id="impact-map" style="width: 100%; height: 100%;"></div>

            <!-- Legend -->
            <div style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 10px; color: white; z-index: 1000;">
                <h3 style="margin: 0 0 10px 0; color: #ff006e;">${asteroidName} Impact Scenario</h3>
                <div style="font-size: 0.9em;">
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ff0000; border-radius: 50%; margin-right: 8px;"></span>Fireball / Vaporization (${zones.vaporization.toFixed(1)} km)</div>
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ff4500; border-radius: 50%; margin-right: 8px;"></span>Total Destruction (${zones.totalDestruction.toFixed(1)} km)</div>
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ff8800; border-radius: 50%; margin-right: 8px;"></span>Severe Blast (${zones.severeBlast.toFixed(0)} km)</div>
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ffaa00; border-radius: 50%; margin-right: 8px;"></span>Thermal Radiation (${zones.thermalRadiation.toFixed(0)} km)</div>
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ffdd00; border-radius: 50%; margin-right: 8px;"></span>Air Blast (${zones.airblast.toFixed(0)} km)</div>
                </div>
            </div>

            <!-- Animation Controls -->
            <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); padding: 15px 20px; border-radius: 15px; color: white; z-index: 1000; display: flex; align-items: center; gap: 15px;">
                <button id="restart-btn" style="background: #ff006e; border: none; color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1.2em;">⏮</button>
                <button id="prev-btn" style="background: #ffd60a; border: none; color: #000; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1.2em;">◀</button>
                <button id="play-pause-btn" style="background: #00ff00; border: none; color: #000; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1.2em; font-weight: bold;">▶ Play</button>
                <button id="next-btn" style="background: #ffd60a; border: none; color: #000; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1.2em;">▶</button>
                <div id="stage-label" style="margin-left: 10px; font-weight: bold; min-width: 200px; text-align: center;">Ready</div>
            </div>
        </div>
    `;
}

// Initialize the impact map with the stored data
function initializeImpactMap() {
    if (!window.pendingMapData) return;
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    const mapElement = document.getElementById('impact-map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    const { lat, lon, zones } = window.pendingMapData;

    try {
        // Start from space view (meteor POV)
        const spaceZoom = 2; // Zoom level to see most of the planet

        const map = L.map('impact-map').setView([lat, lon], spaceZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Impact point marker
        const impactMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'impact-marker',
                html: '<div style="background: red; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [20, 20]
            })
        }).addTo(map).bindPopup('<b>Impact Point</b><br>Pretoria, South Africa');

        // Calculate zoom level based on crater diameter
        // Leaflet zoom levels: each level doubles the scale
        // We want the crater to be at least half the map width
        const craterRadiusKm = zones.fireball || zones.vaporization || 1;
        // At zoom 13, ~5km fills half the screen; adjust from there
        const idealZoom = Math.max(10, Math.min(15, 13 - Math.log2(craterRadiusKm / 5)));

        // Calculate zoom levels for smooth transition
        // spaceZoom already declared above at line 156
        const approachZoom = 5; // Getting closer
        const impactZoom = idealZoom - 1; // Close-up of impact
        const minZoom = Math.max(3, idealZoom - 10); // Final wide view
        const totalZoomSteps = impactZoom - minZoom;

        // Build smooth progressive animation stages
        const stages = [];

        // Calculate approach trajectory (meteor comes from west-northwest, typical orbital approach)
        // WNW is about 292.5 degrees (or -67.5 from north)
        const approachAngle = -67.5 * (Math.PI / 180); // Convert to radians
        const approachDistance = 20; // degrees offset at start
        const startLat = lat + approachDistance * Math.cos(approachAngle);
        const startLon = lon + approachDistance * Math.sin(approachAngle);

        // Stage 1: Approaching from space (start northeast of target)
        stages.push({
            name: 'Approaching',
            description: 'Asteroid approaching Earth from space',
            zoom: spaceZoom,
            viewLat: startLat,
            viewLon: startLon,
            circles: []
        });

        // Stage 2+: Smooth continuous approach - many small steps for fluid motion
        const approachSteps = 20; // More steps = smoother animation
        for (let i = 1; i <= approachSteps; i++) {
            const progress = i / approachSteps;
            // Use easing function for more natural acceleration
            const easedProgress = progress * progress; // Quadratic easing - accelerates as it gets closer
            const currentZoom = spaceZoom + (impactZoom - spaceZoom) * easedProgress;

            // Interpolate position along trajectory
            const currentLat = startLat + (lat - startLat) * progress;
            const currentLon = startLon + (lon - startLon) * progress;

            stages.push({
                name: 'Approaching',
                description: `Closing in on impact site... (${Math.round((1 - progress) * 1000)} km)`,
                zoom: currentZoom,
                viewLat: currentLat,
                viewLon: currentLon,
                circles: []
            });
        }

        // Stage: Impact moment (center on actual impact point)
        stages.push({
            name: 'Impact',
            description: 'Asteroid strikes Earth',
            zoom: impactZoom,
            viewLat: lat,
            viewLon: lon,
            circles: []
        });

        // Stage: Fireball appears (full size immediately)
        stages.push({
            name: 'Fireball',
            description: 'Initial fireball forms',
            zoom: impactZoom,
            viewLat: lat,
            viewLon: lon,
            circles: [
                { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
            ]
        });

        // Progressive growth stages - vaporization growing to total destruction
        const growthSteps = 8;
        for (let i = 1; i <= growthSteps; i++) {
            const progress = i / growthSteps;
            const currentRadius = zones.vaporization + (zones.totalDestruction - zones.vaporization) * progress;
            const currentZoom = impactZoom - Math.floor(totalZoomSteps * progress * 0.35); // Zoom out 35% during this phase

            stages.push({
                name: 'Expanding',
                description: `Shockwave expanding (${Math.round(currentRadius)} km)`,
                zoom: currentZoom,
                circles: [
                    { radius: currentRadius, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Shockwave' },
                    { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
                ]
            });
        }

        // Total destruction reached
        stages.push({
            name: 'Total Destruction',
            description: 'Total destruction zone',
            zoom: impactZoom - Math.floor(totalZoomSteps * 0.45),
            circles: [
                { radius: zones.totalDestruction, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Total Destruction' },
                { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
            ]
        });

        // Severe blast expanding
        const severeSteps = 6;
        for (let i = 1; i <= severeSteps; i++) {
            const progress = i / severeSteps;
            const currentRadius = zones.totalDestruction + (zones.severeBlast - zones.totalDestruction) * progress;
            const currentZoom = impactZoom - Math.floor(totalZoomSteps * (0.45 + progress * 0.25));

            stages.push({
                name: 'Severe Blast',
                description: `Blast wave spreading (${Math.round(currentRadius)} km)`,
                zoom: currentZoom,
                circles: [
                    { radius: currentRadius, color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.3, label: 'Blast Wave' },
                    { radius: zones.totalDestruction, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Total Destruction' },
                    { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
                ]
            });
        }

        // Thermal radiation expanding
        const thermalSteps = 5;
        for (let i = 1; i <= thermalSteps; i++) {
            const progress = i / thermalSteps;
            const currentRadius = zones.severeBlast + (zones.thermalRadiation - zones.severeBlast) * progress;
            const currentZoom = impactZoom - Math.floor(totalZoomSteps * (0.70 + progress * 0.18));

            stages.push({
                name: 'Thermal Radiation',
                description: `Heat wave spreading (${Math.round(currentRadius)} km)`,
                zoom: currentZoom,
                circles: [
                    { radius: currentRadius, color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 0.2, label: 'Thermal Radiation' },
                    { radius: zones.severeBlast, color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.3, label: 'Severe Blast' },
                    { radius: zones.totalDestruction, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Total Destruction' },
                    { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
                ]
            });
        }

        // Air blast expanding to maximum
        const airSteps = 5;
        for (let i = 1; i <= airSteps; i++) {
            const progress = i / airSteps;
            const currentRadius = zones.thermalRadiation + (zones.airblast - zones.thermalRadiation) * progress;
            const currentZoom = impactZoom - Math.floor(totalZoomSteps * (0.88 + progress * 0.12));

            stages.push({
                name: 'Air Blast',
                description: `Air blast expanding (${Math.round(currentRadius)} km)`,
                zoom: currentZoom,
                circles: [
                    { radius: currentRadius, color: '#ffdd00', fillColor: '#ffdd00', fillOpacity: 0.1, label: 'Air Blast' },
                    { radius: zones.thermalRadiation, color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 0.2, label: 'Thermal Radiation' },
                    { radius: zones.severeBlast, color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.3, label: 'Severe Blast' },
                    { radius: zones.totalDestruction, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Total Destruction' },
                    { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
                ]
            });
        }

        // Final stage - maximum extent
        stages.push({
            name: 'Maximum Extent',
            description: 'Full impact effects visible',
            zoom: minZoom,
            circles: [
                { radius: zones.airblast, color: '#ffdd00', fillColor: '#ffdd00', fillOpacity: 0.1, label: 'Air Blast / Broken Windows' },
                { radius: zones.thermalRadiation, color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 0.2, label: 'Thermal Radiation' },
                { radius: zones.severeBlast, color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.3, label: 'Severe Blast Damage' },
                { radius: zones.totalDestruction, color: '#ff4500', fillColor: '#ff4500', fillOpacity: 0.4, label: 'Total Destruction' },
                { radius: zones.vaporization, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.6, label: 'Vaporization Zone' }
            ]
        });

        // Animation state
        let currentStage = 0;
        let isPlaying = false;
        let playInterval = null;
        let currentCircles = [];

        // Update stage
        function updateStage(stageIndex) {
            currentStage = Math.max(0, Math.min(stageIndex, stages.length - 1));
            const stage = stages[currentStage];

            // Clear existing circles
            currentCircles.forEach(circle => map.removeLayer(circle));
            currentCircles = [];

            // Add new circles
            stage.circles.forEach(circleData => {
                const circle = L.circle([lat, lon], {
                    radius: circleData.radius * 1000,
                    color: circleData.color,
                    fillColor: circleData.fillColor,
                    fillOpacity: circleData.fillOpacity,
                    weight: 2
                }).addTo(map).bindPopup(circleData.label);
                currentCircles.push(circle);
            });

            // Smooth animated zoom with easing
            // If stage has approach path (before impact), use it
            const targetLat = stage.viewLat || lat;
            const targetLon = stage.viewLon || lon;

            map.flyTo([targetLat, targetLon], stage.zoom, {
                animate: true,
                duration: 0.5, // 500ms smooth animation - shorter for continuous feel
                easeLinearity: 0.1 // Very smooth easing (lower = smoother)
            });

            // Update label
            document.getElementById('stage-label').textContent = `${stage.name}: ${stage.description}`;
        }

        // Control functions
        function play() {
            if (isPlaying) return;

            // If at the end, restart from beginning
            if (currentStage === stages.length - 1) {
                updateStage(0);
            }

            isPlaying = true;
            document.getElementById('play-pause-btn').textContent = '⏸ Pause';
            document.getElementById('play-pause-btn').style.background = '#ffaa00';

            playInterval = setInterval(() => {
                if (currentStage < stages.length - 1) {
                    updateStage(currentStage + 1);
                } else {
                    pause();
                }
            }, 600); // 600ms per stage - overlaps with flyTo animation for continuous motion
        }

        function pause() {
            isPlaying = false;
            document.getElementById('play-pause-btn').textContent = '▶ Play';
            document.getElementById('play-pause-btn').style.background = '#00ff00';
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
            }
        }

        function restart() {
            pause();
            updateStage(0);
        }

        function prev() {
            pause();
            updateStage(currentStage - 1);
        }

        function next() {
            pause();
            updateStage(currentStage + 1);
        }

        // Attach event listeners - wait a bit for buttons to be in DOM
        setTimeout(() => {
            const playBtn = document.getElementById('play-pause-btn');
            const restartBtn = document.getElementById('restart-btn');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');

            console.log('Looking for buttons...', { playBtn, restartBtn, prevBtn, nextBtn });

            if (playBtn && restartBtn && prevBtn && nextBtn) {
                playBtn.addEventListener('click', () => {
                    console.log('Play button clicked');
                    if (isPlaying) pause();
                    else play();
                });
                restartBtn.addEventListener('click', () => {
                    console.log('Restart clicked');
                    restart();
                });
                prevBtn.addEventListener('click', () => {
                    console.log('Prev clicked');
                    prev();
                });
                nextBtn.addEventListener('click', () => {
                    console.log('Next clicked');
                    next();
                });

                console.log('Animation controls attached successfully');
            } else {
                console.error('Control buttons not found:', {
                    play: !!playBtn,
                    restart: !!restartBtn,
                    prev: !!prevBtn,
                    next: !!nextBtn
                });
            }
        }, 500);

        // Initialize at stage 0
        updateStage(0);

        console.log('Map initialized successfully with animation controls');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Export functions
window.ImpactCalculator = {
    calculateCraterSize,
    calculateDamageZones,
    getDamageDescription,
    createImpactMap,
    initializeImpactMap
};
