# Go Transit Widget Configuration File Naming System

## Overview

Now when you run the `go-transit-config.js` file, the system will first ask you to select a route type, then automatically generate the corresponding configuration file name based on your selection.

## Route Type Selection

After running the configuration script, you will see the following route type options:

### Preset Route Types
1. **Commute Route** → Generated file: `gotransit-config-Commute-route.json`
2. **Home Route** → Generated file: `gotransit-config-Home-route.json`
3. **Friend Route** → Generated file: `gotransit-config-Friend-route.json`
4. **Shopping Route** → Generated file: `gotransit-config-Shopping-route.json`
5. **Travel Route** → Generated file: `gotransit-config-Travel-route.json`
6. **Hospital Route** → Generated file: `gotransit-config-Hospital-route.json`
7. **School Route** → Generated file: `gotransit-config-School-route.json`
8. **Airport Route** → Generated file: `gotransit-config-Airport-route.json`

### Custom Route
9. **Custom Route** → You can enter any name, generated file: `gotransit-config-[Your Input Name]-route.json`

## Configuration File Naming Rules

### Preset Routes
- Format: `gotransit-config-[Route Type]-route.json`
- Example: Select "Commute Route" → Generate `gotransit-config-Commute-route.json`

### Custom Routes
- Format: `gotransit-config-[Custom Name]-route.json`
- Example: Input "Gym" → Generate `gotransit-config-Gym-route.json`

## Usage Process

### 1. Run Configuration Script
```javascript
// Run in Scriptable
await configureStations();
```

### 2. Select Route Type
- Choose from 9 options
- If selecting "Custom Route", you need to input a custom name

### 3. Configure Other Settings
- Select departure line and station
- Select arrival line and station
- Choose travel mode
- Set whether to show return trips
- Set whether to show transfers
- Choose number of trips to display
- Select color theme

### 4. Auto-generate Configuration File
The system will automatically generate the corresponding configuration file name based on your route type selection and save it.

## Configuration File Examples

### Commute Route Configuration
**Filename**: `gotransit-config-Commute-route.json`
```json
{
  "departure": "Union Station GO",
  "arrival": "Markham GO",
  "departureLine": "STOUFFVILLE_LINE",
  "arrivalLine": "STOUFFVILLE_LINE",
  "travelMode": "All",
  "pageLimit": 4,
  "showReturnTrips": false,
  "showTransfers": true,
  "routeType": "Commute Route",
  "colors": {
    "title": "#000000",
    "stationInfo": "#0066CC",
    "timeText": "#333333",
    "duration": "#666666",
    "transferRoute": "#FF6B00",
    "directRoute": "#008E44",
    "stationDetails": "#707070"
  }
}
```

### Custom Route Configuration
**Filename**: `gotransit-config-Gym-route.json`
```json
{
  "departure": "Richmond Hill GO",
  "arrival": "Union Station GO",
  "departureLine": "RICHMOND_HILL_LINE",
  "arrivalLine": "RICHMOND_HILL_LINE",
  "travelMode": "All",
  "pageLimit": 3,
  "showReturnTrips": false,
  "showTransfers": false,
  "routeType": "Gym Route",
  "colors": {
    "title": "#000000",
    "stationInfo": "#0066CC",
    "timeText": "#333333",
    "duration": "#666666",
    "transferRoute": "#FF6B00",
    "directRoute": "#008E44",
    "stationDetails": "#707070"
  }
}
```

## Advantages

### 1. Multi-route Management
- Can create different configuration files for different purposes
- Each route has an independent configuration file
- Easy to manage and switch between different route settings

### 2. Smart Naming
- Filenames intuitively reflect route purpose
- Avoid configuration file confusion
- Easy to quickly identify different routes
- Consistent naming pattern with `gotransit-config-` prefix

### 3. Flexible Configuration
- Support preset route types
- Support completely custom route names
- Each route can have different settings

## Important Notes

### 1. File Management
- Each route type will generate an independent configuration file
- Multiple configuration files can exist simultaneously
- Deleting one configuration file won't affect other routes
- All files follow the `gotransit-config-*` naming pattern

### 2. Route Types
- Route type will be saved in the configuration file
- Main script can display corresponding titles based on route type
- Easy to identify currently used route

### 3. Configuration Updates
- To modify a route's configuration, re-run the configuration script
- Selecting the same route type will overwrite existing configuration
- Can add new route types anytime

## Usage Recommendations

### 1. Route Planning
- **Weekdays**: Use "Commute Route" configuration
- **Weekends**: Use "Shopping Route" or "Friend Route" configuration
- **Special Trips**: Use "Custom Route" configuration

### 2. File Organization
- Keep configuration files for frequently used routes
- Regularly clean up unused configuration files
- Use meaningful custom route names
- All files will be grouped together due to the `gotransit-config-` prefix

### 3. Configuration Optimization
- Adjust display settings based on actual needs
- Choose suitable color themes for different routes
- Consider transfer and return trip display requirements
