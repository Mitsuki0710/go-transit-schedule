# Go Transit Widget Independent Configuration System

## Overview

This system allows you to create independent configuration files for different widgets, rather than distinguishing based on widget size. Each widget can have its own departure station, arrival station, display options, and other configurations.

## Key Features

- **Independent Configuration**: Each widget can have its own unique configuration
- **Backward Compatibility**: If no widget-specific configuration exists, it will use the default configuration
- **Configuration Management**: Provides tools to create, view, and delete widget configurations
- **Flexible Settings**: Supports different routes, display options, and color themes

## Usage

### 1. Setting Up Widget Independent Configuration

1. Run `widget-config-manager.js` in Scriptable
2. Select "Create/Update Config"
3. The system will create a configuration file for the current widget

### 2. Configuration File Format

Each widget's configuration file format is as follows:

```json
{
  "departure": "Union Station GO",
  "arrival": "Unionville GO",
  "showReturnTrips": false,
  "showTransfers": true,
  "pageLimit": 6,
  "travelMode": "All",
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

### 3. Configuration Options

- **departure**: Departure station name
- **arrival**: Arrival station name
- **showReturnTrips**: Whether to show return trips (true/false)
- **showTransfers**: Whether to show transfer trips (true/false)
- **pageLimit**: Limit on the number of trips to query
- **travelMode**: Transportation mode ("All", "Bus", "Train")
- **colors**: Interface color theme

### 4. File Naming Convention

Configuration files are named according to the following rule:
- `gotransit-config-{widgetID}.json`

Examples:
- `gotransit-config-widget1.json`
- `gotransit-config-widget2.json`
- `gotransit-config-default.json`

### 5. Configuration Priority

The system loads configurations in the following priority order:

1. Widget-specific configuration file (`gotransit-config-{widgetID}.json`)
2. Default configuration file (`gotransit-config.json`)
3. Built-in default values

## Management Tools

### Configuration Manager Features

Running `widget-config-manager.js` provides the following features:

1. **Create/Update Config**: Create a new configuration file for the current widget
2. **List All Configs**: View all existing widget configuration files
3. **Delete Current Config**: Delete the current widget's configuration file

### Manual Configuration Editing

You can also manually edit configuration files:

1. Find the configuration file in Scriptable's file manager
2. Use a text editor to modify the JSON content
3. After saving the file, the widget will automatically use the new configuration

## Example Configurations

### Example 1: Commute Route
```json
{
  "departure": "Union Station GO",
  "arrival": "Unionville GO",
  "showReturnTrips": true,
  "showTransfers": false,
  "pageLimit": 4,
  "travelMode": "Train"
}
```

### Example 2: Sightseeing Route
```json
{
  "departure": "Toronto Union Station",
  "arrival": "Niagara Falls",
  "showReturnTrips": false,
  "showTransfers": true,
  "pageLimit": 8,
  "travelMode": "All"
}
```

## Troubleshooting

### Common Issues

1. **Widget shows default configuration**
   - Check if the widget ID is correct
   - Confirm that the configuration file exists

2. **Configuration file cannot be loaded**
   - Check if the JSON format is correct
   - Confirm file permission settings

3. **Configuration changes don't take effect**
   - Restart the Scriptable app
   - Check widget refresh settings

### Debug Information

The system outputs debug information to the console:
- `Loaded config for widget {widgetID}`: Successfully loaded widget-specific configuration
- `Using fallback config for widget {widgetID}`: Using default configuration
- `Using default config for widget {widgetID}`: Using built-in default values

## Important Notes

1. Each widget's configuration is independent; modifying one will not affect other widgets
2. After deleting a configuration file, the widget will fall back to the default configuration
3. Configuration files are stored in Scriptable's documents directory
4. It's recommended to regularly backup important configuration files

## Technical Support

If you encounter issues, please check:
1. Scriptable app version
2. iOS system version
3. Network connection status
4. Configuration file format