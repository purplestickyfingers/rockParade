import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# NASA API endpoint
API_KEY = os.getenv('NASA_API_KEY', 'DEMO_KEY')
BASE_URL = "https://api.nasa.gov/neo/rest/v1/feed"

# Distance thresholds (in km)
MOON_DISTANCE = 384400
CLOSE_APPROACH = 20000000  # 20 million km - show more events
VERY_CLOSE = 1000000  # 1 million km
EXTREMELY_CLOSE = 500000  # 500k km

def fetch_asteroid_data(start_date, end_date):
    """Fetch Near Earth Object data from NASA API"""
    params = {
        'start_date': start_date,
        'end_date': end_date,
        'api_key': API_KEY
    }

    print(f"Fetching asteroid data from {start_date} to {end_date}...")
    response = requests.get(BASE_URL, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def process_asteroid_events(data):
    """Process asteroid data and create event feed"""
    events = []

    for date, neo_list in data['near_earth_objects'].items():
        for neo in neo_list:
            close_approach = neo['close_approach_data'][0]
            miss_distance = float(close_approach['miss_distance']['kilometers'])

            # Only include close approaches
            if miss_distance < CLOSE_APPROACH:
                # Parse and format the time as ISO 8601 for JavaScript
                time_str = close_approach['close_approach_date_full']
                # Convert "2025-Oct-09 01:10" to "2025-10-09T01:10:00"
                try:
                    parsed_time = datetime.strptime(time_str, '%Y-%b-%d %H:%M')
                    iso_time = parsed_time.isoformat()
                except:
                    iso_time = close_approach['close_approach_date'] + 'T00:00:00'

                event = {
                    'name': neo['name'],
                    'neo_reference_id': neo['neo_reference_id'],
                    'date': close_approach['close_approach_date'],
                    'time': iso_time,
                    'miss_distance_km': miss_distance,
                    'miss_distance_lunar': miss_distance / MOON_DISTANCE,
                    'velocity_kmh': float(close_approach['relative_velocity']['kilometers_per_hour']),
                    'diameter_min': neo['estimated_diameter']['meters']['estimated_diameter_min'],
                    'diameter_max': neo['estimated_diameter']['meters']['estimated_diameter_max'],
                    'is_hazardous': neo['is_potentially_hazardous_asteroid'],
                    'magnitude': neo['absolute_magnitude_h']
                }

                # Determine event severity
                if miss_distance < MOON_DISTANCE:
                    event['severity'] = 'critical'
                    event['description'] = 'CLOSER THAN THE MOON'
                elif miss_distance < EXTREMELY_CLOSE:
                    event['severity'] = 'high'
                    event['description'] = 'Extremely close approach'
                elif miss_distance < VERY_CLOSE:
                    event['severity'] = 'high'
                    event['description'] = 'Very close approach'
                else:
                    event['severity'] = 'medium'
                    event['description'] = 'Close approach'

                events.append(event)

    # Sort by date
    events.sort(key=lambda x: x['date'])

    return events

def generate_event_feed():
    """Generate event feed for the previous 7 days and next 30 days (in 7-day chunks)"""
    all_events = []
    today = datetime.now()

    # NASA API only allows 7 days at a time, so fetch in chunks
    # Start from 7 days ago, go to 35 days in future (6 weeks total)
    for week in range(-1, 5):  # -1 to 4 = 6 weeks total
        start = today + timedelta(days=week * 7)
        end = start + timedelta(days=6)

        data = fetch_asteroid_data(
            start.strftime('%Y-%m-%d'),
            end.strftime('%Y-%m-%d')
        )

        if data:
            events = process_asteroid_events(data)
            all_events.extend(events)
        else:
            print(f"Failed to fetch data for week {week + 1}")

        # Small delay to avoid rate limiting
        if week < 4:
            import time
            time.sleep(0.5)

    # Remove duplicates by name+date
    seen = set()
    unique_events = []
    for event in all_events:
        key = (event['name'], event['date'])
        if key not in seen:
            seen.add(key)
            unique_events.append(event)

    # Sort by date
    unique_events.sort(key=lambda x: x['date'])

    # Save to JSON file
    with open('events.json', 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'event_count': len(unique_events),
            'events': unique_events
        }, f, indent=2)

    print(f"\nGenerated {len(unique_events)} unique events")
    print(f"Saved to events.json")

    return unique_events

if __name__ == "__main__":
    events = generate_event_feed()

    # Print summary
    if events:
        print(f"\n{'='*60}")
        print("UPCOMING CLOSE APPROACHES")
        print(f"{'='*60}\n")

        for event in events[:10]:  # Show first 10
            print(f"{event['date']} - {event['name']}")
            print(f"  Distance: {event['miss_distance_km']:,.0f} km ({event['miss_distance_lunar']:.2f} lunar distances)")
            print(f"  Severity: {event['severity'].upper()}")
            if event['is_hazardous']:
                print(f"  ⚠️ POTENTIALLY HAZARDOUS ASTEROID")
            print()
