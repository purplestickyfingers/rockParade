// Get asteroid ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const asteroidId = urlParams.get('id');

const API_KEY = 'QnjB1SuXKjaFibxhV3rVmUcqxzHsKB80hSAWncBO';

async function loadAsteroidDetails() {
    if (!asteroidId) {
        showError('No asteroid ID provided');
        return;
    }

    try {
        const response = await fetch(`https://api.nasa.gov/neo/rest/v1/neo/${asteroidId}?api_key=${API_KEY}`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        displayAsteroidDetails(data);
    } catch (error) {
        console.error('Error loading asteroid details:', error);
        showError('Unable to load asteroid details. Please try again later.');
    }
}

function displayAsteroidDetails(data) {
    // Update header
    document.getElementById('asteroid-name').textContent = data.name;
    document.getElementById('designation').textContent = data.designation || data.neo_reference_id;

    // Create content
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="details-grid">
            <div class="detail-card">
                <h2>Basic Information</h2>
                <div class="detail-item">
                    <div class="detail-label">NEO Reference ID</div>
                    <div class="detail-value">${data.neo_reference_id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Absolute Magnitude</div>
                    <div class="detail-value">H ${data.absolute_magnitude_h}</div>
                </div>
                ${data.is_potentially_hazardous_asteroid ? '<span class="badge hazardous">⚠️ POTENTIALLY HAZARDOUS</span>' : ''}
                ${data.is_sentry_object ? '<span class="badge sentry">🎯 SENTRY OBJECT</span>' : ''}
            </div>

            <div class="detail-card">
                <h2>Estimated Diameter</h2>
                <div class="detail-item">
                    <div class="detail-label">Kilometers</div>
                    <div class="detail-value">
                        ${data.estimated_diameter.kilometers.estimated_diameter_min.toFixed(3)} -
                        ${data.estimated_diameter.kilometers.estimated_diameter_max.toFixed(3)} km
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Meters</div>
                    <div class="detail-value">
                        ${Math.round(data.estimated_diameter.meters.estimated_diameter_min)} -
                        ${Math.round(data.estimated_diameter.meters.estimated_diameter_max)} m
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Feet</div>
                    <div class="detail-value">
                        ${Math.round(data.estimated_diameter.feet.estimated_diameter_min).toLocaleString()} -
                        ${Math.round(data.estimated_diameter.feet.estimated_diameter_max).toLocaleString()} ft
                    </div>
                </div>
            </div>

            <div class="detail-card">
                <h2>Orbital Data</h2>
                ${data.orbital_data ? `
                    <div class="detail-item">
                        <div class="detail-label">Orbit ID</div>
                        <div class="detail-value">${data.orbital_data.orbit_id || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Orbit Determination Date</div>
                        <div class="detail-value">${data.orbital_data.orbit_determination_date || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">First Observation</div>
                        <div class="detail-value">${data.orbital_data.first_observation_date || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Last Observation</div>
                        <div class="detail-value">${data.orbital_data.last_observation_date || 'N/A'}</div>
                    </div>
                ` : '<p>No orbital data available</p>'}
            </div>
        </div>

        ${createImpactScenario(data)}

        ${createApproachesList(data.close_approach_data)}
    `;

    // Initialize the impact map after DOM is updated
    setTimeout(() => {
        if (window.ImpactCalculator && window.ImpactCalculator.initializeImpactMap) {
            window.ImpactCalculator.initializeImpactMap();
        }
    }, 100);
}

function createImpactScenario(data) {
    // Use average diameter and velocity from first close approach
    const avgDiameter = (data.estimated_diameter.meters.estimated_diameter_min +
                        data.estimated_diameter.meters.estimated_diameter_max) / 2;

    if (!data.close_approach_data || data.close_approach_data.length === 0) {
        return '';
    }

    const firstApproach = data.close_approach_data[0];
    const velocityKmH = parseFloat(firstApproach.relative_velocity.kilometers_per_hour);

    // Calculate impact crater and damage
    const impact = window.ImpactCalculator.calculateCraterSize(avgDiameter, velocityKmH);
    const zones = window.ImpactCalculator.calculateDamageZones(impact.craterDiameterKm, impact.energyMegatons);
    const description = window.ImpactCalculator.getDamageDescription(impact, zones);

    return `
        <div class="approaches-list" style="background: rgba(220, 47, 2, 0.1); border: 2px solid #dc2f02;">
            <h2 style="color: #dc2f02;">⚠️ Hypothetical Impact Scenario</h2>
            <p style="color: #adb5bd; margin-bottom: 20px;">
                <em>This is a theoretical calculation. ${data.name} will NOT impact Earth.</em>
            </p>

            <div class="details-grid" style="margin-bottom: 20px;">
                <div class="detail-card">
                    <h3 style="font-size: 1.1em; margin-bottom: 10px;">Crater Dimensions</h3>
                    <div class="detail-item">
                        <div class="detail-label">Diameter</div>
                        <div class="detail-value">${impact.craterDiameterKm.toFixed(1)} km</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Depth</div>
                        <div class="detail-value">${impact.craterDepthKm.toFixed(2)} km</div>
                    </div>
                </div>

                <div class="detail-card">
                    <h3 style="font-size: 1.1em; margin-bottom: 10px;">Impact Energy</h3>
                    <div class="detail-item">
                        <div class="detail-label">Total Energy</div>
                        <div class="detail-value">${impact.energyMegatons.toFixed(1)} MT</div>
                        <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                            ${(impact.energyMegatons / 15).toFixed(0)}x Hiroshima bomb
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="font-size: 1.1em; margin-bottom: 15px; color: #ffd60a;">Damage Assessment</h3>
                <div style="line-height: 1.8;">
                    <p><strong>Immediate:</strong> ${description.immediate}</p>
                    <p><strong>Blast Effects:</strong> ${description.blast}</p>
                    <p><strong>Thermal:</strong> ${description.thermal}</p>
                    <p><strong>Air Blast:</strong> ${description.airblast}</p>
                    <p><strong>Seismic:</strong> ${description.seismic}</p>
                    <p><strong>Casualties:</strong> ${description.casualties}</p>
                </div>
            </div>

            ${window.ImpactCalculator.createImpactMap(zones, data.name)}
        </div>
    `;
}

function createApproachesList(approaches) {
    if (!approaches || approaches.length === 0) {
        return '<div class="approaches-list"><h2>Close Approaches</h2><p>No close approach data available</p></div>';
    }

    // Sort by date, most recent first
    const sortedApproaches = [...approaches].sort((a, b) =>
        new Date(b.close_approach_date) - new Date(a.close_approach_date)
    );

    // Show only the next 10 approaches
    const recentApproaches = sortedApproaches.slice(0, 10);

    return `
        <div class="approaches-list">
            <h2>Close Approaches (Showing ${recentApproaches.length} of ${approaches.length})</h2>
            ${recentApproaches.map(approach => createApproachItem(approach)).join('')}
        </div>
    `;
}

function createApproachItem(approach) {
    // Parse the NASA date format "2025-Oct-09 01:10"
    let date;
    try {
        // Try ISO format first
        date = new Date(approach.close_approach_date_full);
        // If invalid, try parsing the NASA format
        if (isNaN(date.getTime())) {
            const parts = approach.close_approach_date_full.match(/(\d{4})-(\w+)-(\d+)\s+(\d+):(\d+)/);
            if (parts) {
                const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
                date = new Date(parseInt(parts[1]), months[parts[2]], parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]));
            } else {
                date = new Date(approach.close_approach_date);
            }
        }
    } catch {
        date = new Date(approach.close_approach_date);
    }

    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    const missDistanceKm = parseFloat(approach.miss_distance.kilometers);
    const lunarDistance = missDistanceKm / 384400;

    return `
        <div class="approach-item">
            <div class="approach-date">${dateStr} at ${timeStr}</div>
            <div class="approach-details">
                <div class="detail-item">
                    <div class="detail-label">Miss Distance</div>
                    <div class="detail-value">${missDistanceKm.toLocaleString()} km</div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        ${lunarDistance.toFixed(2)} lunar distances
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Velocity</div>
                    <div class="detail-value">
                        ${parseFloat(approach.relative_velocity.kilometers_per_hour).toLocaleString()} km/h
                    </div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        ${(parseFloat(approach.relative_velocity.kilometers_per_second)).toFixed(2)} km/s
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Orbiting Body</div>
                    <div class="detail-value">${approach.orbiting_body}</div>
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="error">
            <h2>⚠️ Error</h2>
            <p>${message}</p>
        </div>
    `;
}

// Load details when page loads
loadAsteroidDetails();
