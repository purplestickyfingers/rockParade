import requests
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# NASA API endpoint
API_KEY = os.getenv('NASA_API_KEY', 'DEMO_KEY')
BASE_URL = "https://api.nasa.gov/neo/rest/v1/feed"

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

def process_asteroid_data(data):
    """Process asteroid data for visualization"""
    asteroids = []

    for date, neo_list in data['near_earth_objects'].items():
        for neo in neo_list:
            asteroids.append({
                'name': neo['name'],
                'date': date,
                'diameter_min': neo['estimated_diameter']['meters']['estimated_diameter_min'],
                'diameter_max': neo['estimated_diameter']['meters']['estimated_diameter_max'],
                'velocity': float(neo['close_approach_data'][0]['relative_velocity']['kilometers_per_hour']),
                'miss_distance': float(neo['close_approach_data'][0]['miss_distance']['kilometers']),
                'hazardous': neo['is_potentially_hazardous_asteroid']
            })

    return asteroids

def create_visualizations(asteroids):
    """Create multiple visualizations of asteroid data"""
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(20, 6))
    fig.suptitle('NASA Potentially Hazardous Asteroids (PHA) Analysis', fontsize=16, fontweight='bold', color='red')

    # Color palette for each asteroid
    colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf']

    # Extract data
    diameters = [(a['diameter_min'] + a['diameter_max']) / 2 for a in asteroids]
    velocities = [a['velocity'] for a in asteroids]
    distances = [a['miss_distance'] for a in asteroids]
    names = [a['name'] for a in asteroids]

    # 1. Size vs Velocity Scatter Plot
    for i, (d, v, n, c) in enumerate(zip(diameters, velocities, names, colors)):
        ax1.scatter(d, v, c=c, alpha=0.7, s=150, edgecolors='black', linewidth=1.5, label=n)
    ax1.set_xlabel('Diameter (meters)', fontsize=12)
    ax1.set_ylabel('Velocity (km/h)', fontsize=12)
    ax1.set_title('Hazardous Asteroid Size vs Velocity', fontsize=14)
    ax1.grid(True, alpha=0.3)
    ax1.legend(loc='best', fontsize=8, framealpha=0.9)

    # 2. Miss Distance Distribution
    ax2.bar(range(len(asteroids)), distances, color=colors[:len(asteroids)], edgecolor='black', alpha=0.7)
    ax2.set_xlabel('Asteroid', fontsize=12)
    ax2.set_ylabel('Miss Distance (km)', fontsize=12)
    ax2.set_title('Hazardous Asteroid Miss Distances', fontsize=14)
    ax2.set_xticks(range(len(asteroids)))
    ax2.set_xticklabels([f'A{i+1}' for i in range(len(asteroids))], fontsize=10)
    ax2.grid(True, alpha=0.3, axis='y')

    # 3. Size vs Distance Analysis
    for i, (dist, diam, n, c) in enumerate(zip(distances, diameters, names, colors)):
        ax3.scatter(dist, diam, c=c, alpha=0.7, s=150, edgecolors='black', linewidth=1.5, label=n)
    ax3.set_xlabel('Miss Distance (km)', fontsize=12)
    ax3.set_ylabel('Diameter (meters)', fontsize=12)
    ax3.set_title('Threat Assessment: Size vs Distance', fontsize=14)
    ax3.grid(True, alpha=0.3)

    # Add moon distance reference line
    moon_distance = 384400
    ax3.axvline(x=moon_distance, color='blue', linestyle='--', linewidth=2, label=f'Moon Distance ({moon_distance:,} km)', alpha=0.7)
    ax3.legend(loc='best', fontsize=8, framealpha=0.9)

    plt.tight_layout()
    plt.savefig('asteroid_analysis.png', dpi=300, bbox_inches='tight')
    print("Visualization saved as 'asteroid_analysis.png'")
    plt.close()

def print_statistics(asteroids):
    """Print interesting statistics"""
    print("\n" + "="*60)
    print("ASTEROID STATISTICS")
    print("="*60)
    print(f"Total asteroids detected: {len(asteroids)}")

    hazardous = [a for a in asteroids if a['hazardous']]
    print(f"Potentially hazardous: {len(hazardous)} ({len(hazardous)/len(asteroids)*100:.1f}%)")

    diameters = [(a['diameter_min'] + a['diameter_max']) / 2 for a in asteroids]
    print(f"\nSize (diameter):")
    print(f"  Smallest: {min(diameters):.2f} meters")
    print(f"  Largest: {max(diameters):.2f} meters")
    print(f"  Average: {np.mean(diameters):.2f} meters")

    velocities = [a['velocity'] for a in asteroids]
    print(f"\nVelocity:")
    print(f"  Slowest: {min(velocities):,.2f} km/h")
    print(f"  Fastest: {max(velocities):,.2f} km/h")
    print(f"  Average: {np.mean(velocities):,.2f} km/h")

    distances = [a['miss_distance'] for a in asteroids]
    print(f"\nMiss Distance:")
    print(f"  Closest: {min(distances):,.2f} km")
    print(f"  Farthest: {max(distances):,.2f} km")
    print(f"  Average: {np.mean(distances):,.2f} km")

    # Earth-Moon distance for reference
    moon_distance = 384400
    close_calls = [d for d in distances if d < moon_distance]
    print(f"\nAsteroids closer than the Moon ({moon_distance:,} km): {len(close_calls)}")
    print("="*60 + "\n")

def main():
    # Fetch data for the last 7 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    data = fetch_asteroid_data(
        start_date.strftime('%Y-%m-%d'),
        end_date.strftime('%Y-%m-%d')
    )

    if data:
        asteroids = process_asteroid_data(data)
        print(f"Processed {len(asteroids)} asteroids")

        # Filter for hazardous objects only
        hazardous_asteroids = [a for a in asteroids if a['hazardous']]
        print(f"Filtered to {len(hazardous_asteroids)} potentially hazardous asteroids")

        if hazardous_asteroids:
            print_statistics(hazardous_asteroids)
            create_visualizations(hazardous_asteroids)
        else:
            print("No hazardous asteroids found in this time period")
    else:
        print("Failed to fetch data")

if __name__ == "__main__":
    main()
