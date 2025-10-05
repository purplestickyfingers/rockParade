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

            ${generateJournalEntry(data.name, zones.totalDestruction)}
        </div>
    `;
}

function generateJournalEntry(asteroidName, destructionRadius) {
    const stories = [
        {
            name: "Maya",
            age: 16,
            entry: `The adults have been whispering about ${asteroidName} in that particular way they do when they think we're not listening. All hushed consonants and worried glances. Rather insulting, actually, since I've been following the trajectory calculations for three weeks now. I know exactly what's coming.

Mother packed the evacuation bags on Tuesday. Father said we'd leave at dawn. It's past noon now, and the bags sit by the door like abandoned pets. Nobody mentions them anymore.

The sky has gone peculiar. That's the only word for it. The afternoon light tastes metallic, and there's a brightness growing in the west that shouldn't be there. Mr. Chen from next door is filming it on his phone, as if recording the end of the world might somehow make it less real. Someone down the block is crying, but most people are just standing in their gardens, watching. We're all terribly civilized about it.

I've kept this journal since I was twelve. Four years of melodramatic heartbreak over boys who never noticed me, agonizing over exam results that won't matter now. I'd imagined my final entry would be profound. Something about love transcending death, or the terrible beauty of existence, or how we're all made of stardust returning home.

But what I actually think is: we should have left yesterday.

The light is so bright now it's burning through my

` },
        {
            name: "Thandi",
            age: 17,
            entry: `Mother keeps saying it's God's will, which is both comforting and infuriating in equal measure. Father stopped arguing with her around breakfast time. Now we're all sitting in the lounge like it's Sunday afternoon, except Sundays were never quite this quiet.

The television showed ${asteroidName} for days - those serious-faced scientists with their careful words. "Possible impact." "Uncertain trajectory." Then "high probability of oceanic strike." Then nothing at all. Just static. The internet died an hour ago. Even the emergency broadcasts have given up their cheerful lies.

Jabu came over this morning. We've been dating for exactly three months and two days, which makes me laugh because I was counting. I was keeping track as if time would continue in its normal, ordered fashion. As if I'd get to tell our children someday about how we met in winter and fell in love by spring.

We sat on the roof. His hand was warm in mine, which seemed important somehow. Worth remembering. He didn't try to say anything profound, which I appreciated. All the profound things have already been said, haven't they?

Mother wants us to pray now. Father says yes. Jabu squeezes my hand.

The ground is trembling. I can

`},
        {
            name: "Lerato",
            age: 15,
            entry: `This is ridiculous. Writing in a journal when the world is ending is possibly the most pointless exercise in human history. And yet here I am, pen in hand, because Mrs. Van Der Merwe's voice is in my head saying "write what you feel, Lerato" as if feelings matter when you're about to be vaporized.

They cancelled school on Monday. Some families left - packed their cars with photograph albums and family bibles and drove to Johannesburg as if a hundred kilometers might save them. The rest of us stayed. Where exactly do you go when the scientists can't decide if it's the whole world ending or just our particular corner of it?

Zinhle and I went to the Voortrekker Monument yesterday. We climbed to the top even though they'd closed it. The security guard had already left. From up there you can see the whole city spread out, the jacaranda trees lining the streets in their October purple. It was absurdly beautiful, indifferent to ${asteroidName} hurtling toward it. We sat up there for hours. Didn't say much. Didn't need to.

Father's workshop has gone silent. For sixteen years I've fallen asleep to the sound of him building things - cabinets, chairs, toys for the neighbor's children. Now he just sits with us, opening his mouth to speak, then closing it again. I think he wants to impart some final piece of fatherly wisdom. But what is there left to say that isn't either a lie or utterly obvious?

There's that poem we read in English. "Rage, rage against the dying of the light." But I don't feel rage. I feel

`},
        {
            name: "Thabo",
            age: 19,
            entry: `Coach cancelled practice. That's how I knew it was real.

Coach doesn't cancel practice for anything. Not floods, not riots, not national emergencies. Last year when the riots reached our township, he made us run drills in the school gym with the doors locked. "The world keeps spinning," he'd say. "You keep training."

But Tuesday morning he just sat on the bench in the empty stadium and told us to go home. Be with our families. I asked him if he was going to his family. He shook his head. Said his family was in Durban. Too far to drive now. So I sat with him. Neither of us said much.

The team group chat has gone quiet. Usually it's chaos - memes, trash talk, someone always trying to start beef. Now it's just Sipho posting "I love you guys" every few hours. We all react with hearts but nobody knows what else to say.

Ma made my favorite dinner. Pap and morogo, the way Gogo taught her. The whole family eating together for the first time in months. My sister kept looking at her phone, then putting it down. Looking for news that isn't coming. Or maybe hoping for a miracle that definitely isn't.

Dad put on the Bulls game from 2009. The one where we beat the Crusaders. We've all seen it a hundred times. But we watched anyway, pretending this was just another Saturday. Pretending ${asteroidName} was just another headline we'd forget about in a week.

The sky is different now. Clearer somehow. Like the world is holding its breath.

I wish we'd made nationals. Stupid thing to think about but

`},
        {
            name: "Kobus",
            age: 16,
            entry: `Pa took the bakkie out to the farm this morning. Said he wanted to see the land one more time. I went with him even though we both knew what that meant. No more harvests. No more planning for next season. Just looking.

The maize is ready. Perfect timing for a harvest that'll never happen. Pa stood there in the middle of the field, running his hand through the stalks the way Oupa taught him. Three generations of Van Wyks working this land. All for nothing now.

We drove to the old oak tree where Pa proposed to Ma. Sat there drinking rooibos from the flask. He told me stories I'd heard a thousand times - about Oupa, about the drought of '92, about the first time he drove a tractor. Like he was trying to make sure someone remembered.

"You're a good son," he said. Just like that. Out of nowhere. Pa doesn't say things like that. He clapped me on the shoulder and looked away real quick.

Ma had koeksisters waiting when we got back. The whole house smells like cinnamon and honey. She's been cooking all day - melktert, biltong, boerewors. Feeding us like we can take it with us wherever we're going next.

The dogs know something's wrong. Bliksem won't leave my side. Keeps pressing his head against my leg like he used to when he was a pup.

I wanted to tell Annelie how I felt about her. Had a whole plan for after finals. Seems pretty stupid now that there won't be any after. Sent her a message anyway. She said

`},
        {
            name: "Dumisani",
            age: 14,
            entry: `Mkhulu says we must sing. The old songs from the village where he grew up. The ones about warriors and ancestors and finding your way home in the dark.

Everyone's here. Uncles I haven't seen since last Christmas, cousins from Johannesburg, even the neighbors from three houses down. Gogo's house is too small for all of us but nobody cares. We're sitting on the floor, on the stairs, spilling out into the yard. All of us together.

The grown-ups have stopped lying to us. That's how I know it's really happening. Usually they make up stories to make things sound better than they are. Not anymore. When I asked Baba if ${asteroidName} would miss us, he just pulled me close and said "I don't think so, my boy."

My little sister Precious doesn't understand. She keeps asking when we can watch cartoons. Mama holds her and hums the song she used to sing when Precious was a baby. I'm trying to remember all the words so I can

Mkhulu is teaching me the names of our ancestors. All the way back to his great-great-grandfather. He says their names are important. That as long as someone remembers their name, they never truly die. I'm trying to remember but there are so many and my hands are

The singing got louder. Gogo started crying but she's still singing. We're all singing now. Even the neighbors who don't know the words. We're so loud I can barely hear the

`},
        {
            name: "Naledi",
            age: 18,
            entry: `They're playing jazz at the corner café. Someone thought we should have music. So Bra Moses pulled out his old saxophone and started playing, and now there's a whole impromptu concert happening in the middle of Hatfield.

Nobody's looting. I thought people would riot, steal things, go crazy. But everyone's just... being nice. Strangers sharing food. The police joined the crowd and started directing traffic so people could dance in the street. Mrs. Chen from the Chinese restaurant is handing out dumplings for free.

It's the most Pretoria thing I've ever seen. The end of the world and we're having a street party.

Bought a chocolate from the corner shop with the last of my data. Phoned my ex to say I was sorry for how things ended. He said he was sorry too. We talked for an hour about nothing important. Everything important.

My roommate and I climbed onto the roof of our res. The stars are incredible tonight. No light pollution anymore - everyone's turned their lights off to watch the sky. Or maybe to stop wasting electricity on a tomorrow that won't come. The Milky Way looks like someone spilled diamonds across black velvet.

We're taking turns pointing out constellations. Making up new ones. That one's the Jacaranda. That one's the Braai Fork. That one's Mrs. Malherbe's Disapproving Stare.

Someone's got a bluetooth speaker playing "Shosholoza". Everyone's singing along. Even the white kids who don't know all the words are trying. It's beautiful and absurd and so perfectly South African it makes my chest

I can see ${asteroidName} now. A bright point moving across the stars. Getting closer.

We're still

`}
    ];

    const story = stories[Math.floor(Math.random() * stories.length)];

    return `
        <div style="background: rgba(0,0,0,0.4); padding: 25px; border-radius: 10px; margin-top: 20px; border-left: 3px solid #ffd60a;">
            <h3 style="font-size: 1.1em; margin-bottom: 15px; color: #ffd60a;">Final Entry</h3>
            <p style="color: #adb5bd; font-size: 0.9em; margin-bottom: 15px; font-style: italic;">
                AI-generated narrative from within the ${destructionRadius.toFixed(1)} km total destruction zone
            </p>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; font-family: 'Georgia', serif;">
                <div style="margin-bottom: 10px; color: #adb5bd; font-size: 0.9em;">
                    <strong>${story.name}, age ${story.age}</strong><br>
                    Location: ${destructionRadius.toFixed(1)} km from impact site
                </div>
                <div style="line-height: 1.8; color: #e9ecef; white-space: pre-line; font-size: 0.95em;">
${story.entry}                </div>
            </div>
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
