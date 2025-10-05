#!/usr/bin/env python3
"""
Fetch orbital data for all asteroids in events.json and save to orbital_data.json
"""

import json
import requests
import time
from pathlib import Path

API_KEY = 'QnjB1SuXKjaFibxhV3rVmUcqxzHsKB80hSAWncBO'

def fetch_orbital_data():
    # Load events
    with open('events.json', 'r') as f:
        events_data = json.load(f)

    orbital_data = {}
    total = len(events_data['events'])

    print(f"Fetching orbital data for {total} asteroids...")

    for i, event in enumerate(events_data['events'], 1):
        neo_id = event['neo_reference_id']
        name = event['name']

        print(f"[{i}/{total}] Fetching {name}...", end=' ')

        try:
            url = f"https://api.nasa.gov/neo/rest/v1/neo/{neo_id}?api_key={API_KEY}"
            response = requests.get(url)
            response.raise_for_status()

            data = response.json()

            if 'orbital_data' in data:
                od = data['orbital_data']
                orbital_data[neo_id] = {
                    'name': name,
                    'semi_major_axis': float(od.get('semi_major_axis', 1.0)),
                    'eccentricity': float(od.get('eccentricity', 0.1)),
                    'perihelion_argument': float(od.get('perihelion_argument', 0)),
                    'mean_anomaly': float(od.get('mean_anomaly', 0)),
                    'orbital_period': float(od.get('orbital_period', 365)),
                    'inclination': float(od.get('inclination', 0)),
                    'ascending_node_longitude': float(od.get('ascending_node_longitude', 0)),
                    'epoch_osculation': float(od.get('epoch_osculation', 2461000.5))  # Julian date
                }
                print("✓")
            else:
                print("No orbital data")

            # Delay to avoid rate limiting
            time.sleep(0.05)

        except Exception as e:
            print(f"Error: {e}")

    # Save to file
    with open('orbital_data.json', 'w') as f:
        json.dump(orbital_data, f, indent=2)

    print(f"\nSaved orbital data for {len(orbital_data)} asteroids to orbital_data.json")

if __name__ == '__main__':
    fetch_orbital_data()
