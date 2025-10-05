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
        <div style="position: relative; width: 100%; height: 600px; background: #1a1a2e; border-radius: 15px; overflow: hidden;">
            <div id="impact-map" style="width: 100%; height: 100%;"></div>
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
        const map = L.map('impact-map').setView([lat, lon], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add damage zones as circles (largest to smallest)
        L.circle([lat, lon], {
            radius: zones.airblast * 1000,
            color: '#ffdd00',
            fillColor: '#ffdd00',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(map).bindPopup('Air Blast / Broken Windows');

        L.circle([lat, lon], {
            radius: zones.thermalRadiation * 1000,
            color: '#ffaa00',
            fillColor: '#ffaa00',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map).bindPopup('Thermal Radiation');

        L.circle([lat, lon], {
            radius: zones.severeBlast * 1000,
            color: '#ff8800',
            fillColor: '#ff8800',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map).bindPopup('Severe Blast Damage');

        L.circle([lat, lon], {
            radius: zones.totalDestruction * 1000,
            color: '#ff4500',
            fillColor: '#ff4500',
            fillOpacity: 0.4,
            weight: 2
        }).addTo(map).bindPopup('Total Destruction');

        L.circle([lat, lon], {
            radius: zones.vaporization * 1000,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.6,
            weight: 2
        }).addTo(map).bindPopup('Vaporization Zone');

        // Impact point marker
        L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'impact-marker',
                html: '<div style="background: red; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                iconSize: [20, 20]
            })
        }).addTo(map).bindPopup('<b>Impact Point</b><br>Pretoria, South Africa');

        console.log('Map initialized successfully');
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
