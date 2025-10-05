// Load and display asteroid events
async function loadEvents() {
    try {
        const response = await fetch('events.json');
        const data = await response.json();

        displayStats(data);
        displayEvents(data.events);
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('event-feed').innerHTML = `
            <div class="no-events">
                <h2>⚠️ Unable to load events</h2>
                <p>Please run generate_events.py to create the event feed</p>
            </div>
        `;
    }
}

function displayStats(data) {
    // Event count
    document.getElementById('event-count').textContent = data.event_count;

    // Closest approach
    if (data.events.length > 0) {
        const closest = Math.min(...data.events.map(e => e.miss_distance_lunar));
        document.getElementById('closest-approach').textContent = `${closest.toFixed(2)} LD`;
    } else {
        document.getElementById('closest-approach').textContent = 'N/A';
    }

    // Last update
    const updateDate = new Date(data.generated_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - updateDate) / 1000 / 60);

    if (diffMinutes < 60) {
        document.getElementById('last-update').textContent = `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
        document.getElementById('last-update').textContent = `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
        document.getElementById('last-update').textContent = `${Math.floor(diffMinutes / 1440)}d ago`;
    }
}

function displayEvents(events) {
    const feed = document.getElementById('event-feed');

    if (events.length === 0) {
        feed.innerHTML = `
            <div class="no-events">
                <h2>✨ Clear Skies Ahead</h2>
                <p>No close approaches detected in the next 7 days</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = events.map(event => createEventCard(event)).join('');
}

function createEventCard(event) {
    const date = new Date(event.time);
    const isUpcoming = date > new Date();
    const dateStr = formatDate(date);
    const timeStr = formatTime(date);

    const avgDiameter = (event.diameter_min + event.diameter_max) / 2;
    const neoId = event.neo_reference_id || extractNeoId(event.name);

    return `
        <a href="detail.html?id=${neoId}" style="text-decoration: none; color: inherit; display: block; cursor: pointer;">
        <div class="event ${event.severity}">
            <div class="event-header">
                <div>
                    <div class="event-name">${event.name}</div>
                    ${event.is_hazardous ? '<span class="badge hazardous">⚠️ POTENTIALLY HAZARDOUS</span>' : ''}
                    <span class="badge severity-${event.severity}">${event.description}</span>
                </div>
                <div class="event-date">
                    ${dateStr}<br>
                    <span style="font-size: 0.8em; color: #adb5bd;">${timeStr}</span>
                </div>
            </div>

            <div class="event-details">
                <div class="detail">
                    <div class="detail-label">Miss Distance</div>
                    <div class="detail-value">${formatNumber(event.miss_distance_km)} km</div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        ${event.miss_distance_lunar.toFixed(2)} lunar distances
                    </div>
                </div>

                <div class="detail">
                    <div class="detail-label">Velocity</div>
                    <div class="detail-value">${formatNumber(event.velocity_kmh)} km/h</div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        ${(event.velocity_kmh / 3600).toFixed(1)} km/s
                    </div>
                </div>

                <div class="detail">
                    <div class="detail-label">Estimated Size</div>
                    <div class="detail-value">${Math.round(avgDiameter)} m</div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        ${Math.round(event.diameter_min)} - ${Math.round(event.diameter_max)} m
                    </div>
                </div>

                <div class="detail">
                    <div class="detail-label">Brightness</div>
                    <div class="detail-value">H ${event.magnitude.toFixed(1)}</div>
                    <div style="font-size: 0.85em; color: #adb5bd; margin-top: 5px;">
                        Absolute magnitude
                    </div>
                </div>
            </div>
        </div>
        </a>
    `;
}

function extractNeoId(name) {
    // Extract number from various formats:
    // "319988 (2007 DK)" -> "3159988"
    // "(2025 SP23)" -> encode the designation
    const match = name.match(/^(\d+)/);
    if (match) {
        return match[1];
    }
    // For names like "(2025 SP23)", encode the designation
    return encodeURIComponent(name.replace(/[()]/g, '').trim());
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

// Load events when page loads
loadEvents();

// Reload events every 5 minutes
setInterval(loadEvents, 5 * 60 * 1000);
