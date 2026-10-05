# FuelFind

FuelFind is a web application for finding and comparing current fuel prices at verified petrol stations in Heidelberg, Germany.

The application combines live fuel-price data from Tankerkönig / MTS-K with a verified Heidelberg station catalogue and presents the information through a responsive Vue-based user interface.

## Overview

FuelFind helps users quickly answer questions such as:

- Which nearby station currently has the cheapest fuel?
- Which station is closest?
- Which stations are open now?
- How do two stations compare in price and distance?
- Where is a station located?
- How can I navigate to the station?

The project focuses on Heidelberg and supports E5, E10 and Diesel.

## Features

### Find Stations

- Search verified fuel stations in Heidelberg
- Select E5, E10 or Diesel
- Select a search radius
- Use Heidelberg as the default search centre
- Use the user's current location with browser permission
- Sort stations by cheapest price
- Sort stations by nearest distance
- Filter stations that are currently open
- View station results on an interactive map
- Synchronize station cards with map markers

### Station Comparison

Users can select up to two stations and compare:

- Current fuel price
- Price difference in cents per litre
- Distance
- Distance difference
- Current open/closed status
- Heidelberg district

### Heidelberg Prices

The Heidelberg Prices dashboard provides a city-wide fuel-price overview.

It includes:

- E5, E10 and Diesel price selection
- Cheapest current price
- Highest current price
- Average price
- Median price
- Station ranking
- Interactive city map
- Retrieval time
- Fuel-price data source

A single live retrieval contains the available fuel prices, so switching fuel tabs does not require another provider request.

### Station Details

Each verified station has a dedicated details page containing:

- Station name and brand
- Address
- Heidelberg district
- Regular opening hours when available
- Current E5 price
- Current E10 price
- Current Diesel price
- Current open/closed status
- Retrieval time
- Data source
- Interactive station map
- Google Maps directions

If regular opening hours are not available in the verified catalogue, FuelFind clearly displays that the information is unavailable instead of making assumptions.

### User Interface

- Responsive desktop and mobile layout
- Light and dark themes
- Keyboard-accessible controls
- Loading states
- Error states
- Empty states
- Clear data-source information

## Technology Stack

### Frontend

- Vue 3
- Vite
- Pinia
- Vue Router
- Tailwind CSS
- Leaflet
- Vue Leaflet
- Lucide Icons

### Backend

- Node.js
- Express
- MongoDB
- Mongoose

### Data and Services

- Tankerkönig / MTS-K fuel-price API
- OpenStreetMap
- Leaflet
- Google Maps directions
- Heidelberg district GeoJSON data

## Architecture

FuelFind uses a frontend/backend architecture.

```text
Vue Frontend
     |
     | HTTP / JSON
     v
Node.js + Express Backend
     |
     +---- MongoDB
     |
     +---- Tankerkönig / MTS-K