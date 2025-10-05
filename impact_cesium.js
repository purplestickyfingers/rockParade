// Impact crater and damage calculations (reused from original)

function calculateCraterSize(asteroidDiameter, velocity, density = 2500) {
    const diameterKm = asteroidDiameter / 1000;
    const velocityKmS = velocity / 3600;
    const asteroidDensity = density;
    const targetDensity = 2500;

    const mass = (4/3) * Math.PI * Math.pow(diameterKm * 500, 3) * asteroidDensity;
    const energy = 0.5 * mass * Math.pow(velocityKmS * 1000, 2);
    const energyMegatons = energy / (4.184 * Math.pow(10, 15));

    const craterDiameter = 1.8 * diameterKm *
                          Math.pow(asteroidDensity / targetDensity, 1/3) *
                          Math.pow(velocityKmS, 0.44);
    const craterDepth = craterDiameter / 4;

    return {
        craterDiameterKm: craterDiameter,
        craterDepthKm: craterDepth,
        energyMegatons: energyMegatons,
        asteroidDiameterKm: diameterKm,
        velocityKmS: velocityKmS
    };
}

function calculateDamageZones(craterDiameterKm, energyMegatons) {
    return {
        fireball: craterDiameterKm / 2,
        vaporization: craterDiameterKm * 0.75,
        totalDestruction: craterDiameterKm * 2,
        severeBlast: Math.sqrt(energyMegatons) * 5,
        moderateBlast: Math.sqrt(energyMegatons) * 10,
        thermalRadiation: Math.sqrt(energyMegatons) * 15,
        airblast: Math.sqrt(energyMegatons) * 25
    };
}

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
    const urbanDensity = 1500;
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

// Create Cesium globe visualization
function createImpactMap(zones, asteroidName) {
    const lat = -25.7479;
    const lon = 28.2293;

    window.pendingMapData = {
        lat: lat,
        lon: lon,
        zones: zones,
        asteroidName: asteroidName
    };

    return `
        <div style="position: relative; width: 100%; height: 700px; background: #000; border-radius: 15px; overflow: hidden;">
            <div id="cesiumContainer" style="width: 100%; height: 100%;"></div>

            <!-- Legend -->
            <div style="position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 10px; color: white; z-index: 1000;">
                <h3 style="margin: 0 0 10px 0; color: #ff006e;">${asteroidName} Impact Scenario</h3>
                <div style="font-size: 0.9em;">
                    <div style="margin: 5px 0;"><span style="display: inline-block; width: 15px; height: 15px; background: #ff0000; border-radius: 50%; margin-right: 8px;"></span>Vaporization (${zones.vaporization.toFixed(1)} km)</div>
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

// Initialize Cesium viewer with animation
function initializeImpactMap() {
    if (!window.pendingMapData) return;
    if (typeof Cesium === 'undefined') {
        console.error('Cesium not loaded');
        return;
    }

    const { lat, lon, zones, asteroidName } = window.pendingMapData;

    try {
        // Create viewer with ellipsoid-only mode (no imagery needed)
        const viewer = new Cesium.Viewer('cesiumContainer', {
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            infoBox: false,
            selectionIndicator: false,
            imageryProvider: false  // Disable imagery entirely
        });

        // Style the globe with a simple color to represent Earth
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a4d2e');
        viewer.scene.globe.enableLighting = false;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;

        console.log('Cesium viewer created, setting initial camera position...');

        const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

        // Set initial camera position immediately to see Earth
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 10000000),
            orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(-90),
                roll: 0.0
            }
        });

        console.log('Initial camera set to:', lon, lat, '10M meters altitude');

        // Calculate approach from WNW
        const approachAngle = -67.5 * (Math.PI / 180);
        const approachDistance = 20;
        const startLat = lat + approachDistance * Math.cos(approachAngle);
        const startLon = lon + approachDistance * Math.sin(approachAngle);

        // Animation state
        let currentStage = 0;
        let isPlaying = false;
        let playInterval = null;
        let damageCircles = [];

        // Build animation stages
        const stages = buildAnimationStages(lat, lon, startLat, startLon, zones);

        function buildAnimationStages(lat, lon, startLat, startLon, zones) {
            const stages = [];

            // Space view approaching (closer so we can see Earth)
            stages.push({
                name: 'Approaching',
                description: 'Asteroid approaching from space',
                position: Cesium.Cartesian3.fromDegrees(startLon, startLat, 5000000),
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                circles: []
            });

            // Approach stages
            for (let i = 1; i <= 20; i++) {
                const progress = i / 20;
                const easedProgress = progress * progress;
                const currentLat = startLat + (lat - startLat) * progress;
                const currentLon = startLon + (lon - startLon) * progress;
                const altitude = 5000000 * (1 - easedProgress) + 50000 * easedProgress;

                stages.push({
                    name: 'Approaching',
                    description: `Closing in... (${Math.round((1 - progress) * 1000)} km)`,
                    position: Cesium.Cartesian3.fromDegrees(currentLon, currentLat, altitude),
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-45 - 45 * easedProgress),
                    circles: []
                });
            }

            // Impact
            stages.push({
                name: 'Impact',
                description: 'Asteroid strikes Earth!',
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 20000),
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                circles: []
            });

            // Fireball
            stages.push({
                name: 'Fireball',
                description: 'Initial fireball forms',
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 20000),
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90),
                circles: [{radius: zones.vaporization, color: Cesium.Color.RED.withAlpha(0.6)}]
            });

            // Expansion stages
            const expansionSteps = [
                {zone: zones.totalDestruction, color: Cesium.Color.ORANGERED.withAlpha(0.4), altitude: 50000},
                {zone: zones.severeBlast, color: Cesium.Color.ORANGE.withAlpha(0.3), altitude: 100000},
                {zone: zones.thermalRadiation, color: Cesium.Color.YELLOW.withAlpha(0.2), altitude: 200000},
                {zone: zones.airblast, color: Cesium.Color.GOLD.withAlpha(0.1), altitude: 500000}
            ];

            expansionSteps.forEach((step, idx) => {
                stages.push({
                    name: 'Expanding',
                    description: `Blast wave ${step.zone.toFixed(0)} km`,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, step.altitude),
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-90),
                    circles: expansionSteps.slice(0, idx + 1).map(s => ({
                        radius: s.zone,
                        color: s.color
                    })).concat([{radius: zones.vaporization, color: Cesium.Color.RED.withAlpha(0.6)}])
                });
            });

            return stages;
        }

        function updateStage(stageIndex) {
            currentStage = Math.max(0, Math.min(stageIndex, stages.length - 1));
            const stage = stages[currentStage];

            // Clear existing circles
            damageCircles.forEach(entity => viewer.entities.remove(entity));
            damageCircles = [];

            // Add new circles
            stage.circles.forEach(circleData => {
                const entity = viewer.entities.add({
                    position: position,
                    ellipse: {
                        semiMinorAxis: circleData.radius * 1000,
                        semiMajorAxis: circleData.radius * 1000,
                        material: circleData.color,
                        outline: true,
                        outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
                        outlineWidth: 2
                    }
                });
                damageCircles.push(entity);
            });

            // Animate camera
            viewer.camera.flyTo({
                destination: stage.position,
                orientation: {
                    heading: stage.heading,
                    pitch: stage.pitch,
                    roll: 0.0
                },
                duration: 0.5,
                easingFunction: Cesium.EasingFunction.LINEAR_NONE
            });

            document.getElementById('stage-label').textContent = `${stage.name}: ${stage.description}`;
        }

        function play() {
            if (isPlaying) return;
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
            }, 600);
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

        // Attach controls
        setTimeout(() => {
            const playBtn = document.getElementById('play-pause-btn');
            const restartBtn = document.getElementById('restart-btn');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');

            if (playBtn && restartBtn && prevBtn && nextBtn) {
                playBtn.addEventListener('click', () => {
                    if (isPlaying) pause();
                    else play();
                });
                restartBtn.addEventListener('click', restart);
                prevBtn.addEventListener('click', prev);
                nextBtn.addEventListener('click', next);
                console.log('Cesium animation controls attached');
            }
        }, 500);

        // Start at first stage
        updateStage(0);

        console.log('Cesium viewer initialized successfully');
    } catch (error) {
        console.error('Error initializing Cesium:', error);
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
