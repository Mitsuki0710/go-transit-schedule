// Configuration script
let STOUFFVILLE_LINE = ["Union Station GO", "Kennedy GO", "Agincourt GO", "Miliken GO", "Unionville GO", "Centennial GO", "Markham GO", "Mount Joy GO", "Stouffville GO", "Old Elm GO"];
let RICHMOND_HILL_LINE = ["Union Station GO", "Oriole GO", "Old Cummer GO", "Langstaff GO", "Richmond Hill GO", "Gormley GO", "Bloomington GO"];
let BARRIE_LINE = ["Union Station GO", "Downsview Park GO", "Rutherford GO", "Maple GO", "King City GO", "Aurora GO", "Newmarket GO", "East Gwillimbury GO", "Bradford GO", "Barrie South GO", "Allandale Waterfront GO"];
let KITCHENER_LINE = ["Union Station GO", "Bloor GO", "Weston GO", "Etobicoke North GO", "Malton GO", "Bramalea GO", "Brampton Innovation GO", "Mount Pleasant GO", "Georgetown GO", "Acton GO", "Guelph Central GO", "Kitchener GO"];
let LAKESHORE_EAST_LINE = ["Union Station GO", "Danforth GO", "Scarborough GO", "Eglinton GO", "Guildwood GO", "Rouge Hill GO", "Pickering GO", "Ajax GO", "Whitby GO", "Oshawa GO"];
let LAKESHORE_WEST_LINE = ["Union Station GO", "Exhibition GO", "Mimico GO", "Long Branch GO", "Port Credit GO", "Clarkson GO", "Oakville GO", "Bronte GO", "Appleby GO", "Burlington GO", "West Harbour GO", "Hamilton GO", "St Catharines GO", "Niagara Falls GO"];
let MILTON_LINE = ["Union Station GO", "Kipling GO", "Dixie GO", "Cooksville GO", "Erindale GO", "Streetsville GO", "Meadowvale GO", "Lisgar GO", "Milton GO"];
let UP_EXPRESS = ["Union Station GO", "Bloor GO", "Weston GO", "Pearson Airport GO"];

const stations = {
    STOUFFVILLE_LINE: STOUFFVILLE_LINE,
    RICHMOND_HILL_LINE: RICHMOND_HILL_LINE,
    BARRIE_LINE: BARRIE_LINE,
    KITCHENER_LINE: KITCHENER_LINE,
    LAKESHORE_EAST_LINE: LAKESHORE_EAST_LINE,
    LAKESHORE_WEST_LINE: LAKESHORE_WEST_LINE,
    MILTON_LINE: MILTON_LINE,
    UP_EXPRESS: UP_EXPRESS
}

const colorSchemes = {
    light: {
        title: "#000000",
        stationInfo: "#0066CC",
        timeText: "#333333",
        duration: "#666666",
        transferRoute: "#FF6B00",
        directRoute: "#008E44",
        stationDetails: "#707070"
    },
    dark: {
        title: "#FFFFFF",
        stationInfo: "#7CB9E8",
        timeText: "#E0E0E0",
        duration: "#B0B0B0",
        transferRoute: "#FFB74D",
        directRoute: "#4CAF50",
        stationDetails: "#A0A0A0"
    }
};

// Route type selection function
async function selectRouteType() {
    let alert = new Alert();
    alert.title = "Select Route Type";
    alert.message = "Please select your route type, or customize a route name";
    
    alert.addAction("Commute Route");
    alert.addAction("Home Route");
    alert.addAction("Friend Route");
    alert.addAction("Shopping Route");
    alert.addAction("Travel Route");
    alert.addAction("Hospital Route");
    alert.addAction("School Route");
    alert.addAction("Airport Route");
    alert.addAction("Custom Route");
    alert.addCancelAction("Cancel");
    
    let routeType = await alert.presentAlertSheet();
    
    if (routeType === 8) { // Custom route
        let customAlert = new Alert();
        customAlert.title = "Custom Route Name";
        customAlert.message = "Please enter your route name (e.g., Gym, Library, etc.)";
        customAlert.addTextField("Route Name", "");
        customAlert.addAction("OK");
        customAlert.addCancelAction("Cancel");
        
        let customResult = await customAlert.presentAlert();
        if (customResult === 0) {
            let customName = customAlert.textFieldValue(0);
            if (customName && customName.trim() !== "") {
                return {
                    type: "custom",
                    name: customName.trim() + " Route",
                    filename: "gotransit-config-" + customName.trim() + "-route.json"
                };
            }
        }
        return null;
    } else if (routeType >= 0 && routeType <= 7) {
        const routeNames = ["Commute", "Home", "Friend", "Shopping", "Travel", "Hospital", "School", "Airport"];
        const routeName = routeNames[routeType] + " Route";
        return {
            type: "preset",
            name: routeName,
            filename: "gotransit-config-" + routeNames[routeType] + "-route.json"
        };
    }
    
    return null;
}

async function customizeColors() {
    const colorTypes = {
        title: "Title",
        stationInfo: "Station Info",
        timeText: "Time Text",
        duration: "Duration",
        transferRoute: "Transfer Route",
        directRoute: "Direct Route",
        stationDetails: "Station Details"
    };

    let customColors = {};
    
    for (let [key, label] of Object.entries(colorTypes)) {
        let colorAlert = new Alert();
        colorAlert.title = `Select ${label} Color`;
        colorAlert.message = "Please select a preset color or enter a hex color code (e.g., #FF0000)";
        
        // Add preset colors
        const presetColors = {
            "Black": "#000000",
            "White": "#FFFFFF",
            "Dark Blue": "#0066CC",
            "Light Blue": "#7CB9E8",
            "Dark Green": "#008E44",
            "Light Green": "#4CAF50",
            "Orange": "#FF6B00",
            "Gray": "#666666"
        };

        // Add preset color options
        for (let [colorName, colorValue] of Object.entries(presetColors)) {
            colorAlert.addAction(colorName);
        }
        
        // Add custom input option
        colorAlert.addAction("Enter Custom Color");
        colorAlert.addCancelAction("Cancel");
        
        let colorIndex = await colorAlert.presentSheet();
        
        if (colorIndex === -1) {
            return colorSchemes.light; // Return default light theme if cancelled
        }
        
        if (colorIndex < Object.keys(presetColors).length) {
            // Selected preset color
            customColors[key] = Object.values(presetColors)[colorIndex];
        } else {
            // Custom input
            let inputAlert = new Alert();
            inputAlert.title = "Enter Color Code";
            inputAlert.message = "Please enter a hex color code (e.g., #FF0000)";
            inputAlert.addTextField("Color Code", "#");
            inputAlert.addAction("OK");
            inputAlert.addCancelAction("Cancel");
            
            await inputAlert.present();
            let colorCode = inputAlert.textFieldValue(0);
            
            // Validate color code format
            if (/^#[0-9A-Fa-f]{6}$/.test(colorCode)) {
                customColors[key] = colorCode;
            } else {
                let errorAlert = new Alert();
                errorAlert.title = "Error";
                errorAlert.message = "Invalid color code. Using default color instead.";
                errorAlert.addAction("OK");
                await errorAlert.presentAlert();
                customColors[key] = colorSchemes.light[key];
            }
        }
    }
    
    return customColors;
}

async function configureStations() {
    try {
        // First, select route type
        let routeInfo = await selectRouteType();
        if (!routeInfo) {
            console.log("Route type selection cancelled");
            return;
        }
        
        // Select departure line first
        let departureLineIndex;
        while (departureLineIndex === undefined) {
            let departureLineAlert = new Alert();
            departureLineAlert.title = "Select Departure Line";
            departureLineAlert.message = "Please select a line";
            Object.keys(stations).forEach(line => departureLineAlert.addAction(line));
            departureLineAlert.addCancelAction("Cancel");
            departureLineIndex = await departureLineAlert.presentSheet();
            if (departureLineIndex === -1) {
                return;
            }
        }
        
        // Get departure line name and stations
        let departureLineName = Object.keys(stations)[departureLineIndex];
        let departureStations = stations[departureLineName];
        
        // Select departure station from the selected line
        let departureStationIndex;
        while (departureStationIndex === undefined) {
            let departureStationAlert = new Alert();
            departureStationAlert.title = `Select Departure Station (${departureLineName})`;
            departureStationAlert.message = "Please select a station";
            departureStations.forEach(station => departureStationAlert.addAction(station));
            departureStationAlert.addCancelAction("Cancel");
            departureStationIndex = await departureStationAlert.presentSheet();
            if (departureStationIndex === -1) {
                return;
            }
        }
        
        // Select arrival line
        let arrivalLineIndex;
        while (arrivalLineIndex === undefined) {
            let arrivalLineAlert = new Alert();
            arrivalLineAlert.title = "Select Arrival Line";
            arrivalLineAlert.message = "Please select a line";
            Object.keys(stations).forEach(line => arrivalLineAlert.addAction(line));
            arrivalLineAlert.addCancelAction("Cancel");
            arrivalLineIndex = await arrivalLineAlert.presentSheet();
            if (arrivalLineIndex === -1) {
                return;
            }
        }
        
        // Get arrival line name and stations
        let arrivalLineName = Object.keys(stations)[arrivalLineIndex];
        let arrivalStations = stations[arrivalLineName];
        
        // Select arrival station from the selected line
        let arrivalStationIndex;
        while (arrivalStationIndex === undefined) {
            let arrivalStationAlert = new Alert();
            arrivalStationAlert.title = `Select Arrival Station (${arrivalLineName})`;
            arrivalStationAlert.message = "Please select a station";
            arrivalStations.forEach(station => arrivalStationAlert.addAction(station));
            arrivalStationAlert.addCancelAction("Cancel");
            arrivalStationIndex = await arrivalStationAlert.presentSheet();
            if (arrivalStationIndex === -1) {
                return;
            }
        }
        
        // Select travel mode
        let modeIndex;
        while (modeIndex === undefined) {
            let modeAlert = new Alert();
            modeAlert.title = "Select Travel Mode";
            modeAlert.message = "Please select a travel mode";
            modeAlert.addAction("All");
            modeAlert.addAction("Train Only");
            modeAlert.addAction("Bus Only");
            modeAlert.addCancelAction("Cancel");
            modeIndex = await modeAlert.presentSheet();
            if (modeIndex === -1) {
                return;
            }
        }

        // Select whether to show return trips
        let returnTripsIndex;
        while (returnTripsIndex === undefined) {
            let returnTripsAlert = new Alert();
            returnTripsAlert.title = "Show Return Trips";
            returnTripsAlert.message = "Do you want to show return trips?";
            returnTripsAlert.addAction("Yes");
            returnTripsAlert.addAction("No");
            returnTripsAlert.addCancelAction("Cancel");
            returnTripsIndex = await returnTripsAlert.presentSheet();
            if (returnTripsIndex === -1) {
                return;
            }
        }

        // Select whether to show transfer trips
        let transfersIndex;
        while (transfersIndex === undefined) {
            let transfersAlert = new Alert();
            transfersAlert.title = "Show Transfer Trips";
            transfersAlert.message = "Do you want to show trips with transfers?";
            transfersAlert.addAction("Yes");
            transfersAlert.addAction("No");
            transfersAlert.addCancelAction("Cancel");
            transfersIndex = await transfersAlert.presentSheet();
            if (transfersIndex === -1) {
                return;
            }
        }
        
        // Select number of trips to show
        const tripNumArray = [2, 3, 4];
        let tripNumIndex;
        while (tripNumIndex === undefined) {
            let tripNumAlert = new Alert();
            tripNumAlert.title = "Number of Trips to Show";
            tripNumAlert.message = "Please select the number of trips";
            tripNumArray.forEach(num => tripNumAlert.addAction(num.toString()));
            tripNumAlert.addCancelAction("Cancel");
            tripNumIndex = await tripNumAlert.presentSheet();
            if (tripNumIndex === -1) {
                return;
            }
        }

        // Convert mode selection to API parameter
        let travelMode;
        switch(modeIndex) {
            case 0:
                travelMode = "All";
                break;
            case 1:
                travelMode = "Train";
                break;
            case 2:
                travelMode = "Bus";
                break;
        }
        
        // Select color theme
        let themeIndex;
        while (themeIndex === undefined) {
            let themeAlert = new Alert();
            themeAlert.title = "Select Color Theme";
            themeAlert.message = "Please choose a display mode";
            themeAlert.addAction("Light Mode");
            themeAlert.addAction("Dark Mode");
            themeAlert.addAction("Custom Colors");
            themeAlert.addCancelAction("Cancel");
            themeIndex = await themeAlert.presentSheet();
            if (themeIndex === -1) {
                return;
            }
        }

        let selectedColors;
        if (themeIndex === 0) {
            selectedColors = colorSchemes.light;
        } else if (themeIndex === 1) {
            selectedColors = colorSchemes.dark;
        } else {
            // Custom colors
            selectedColors = await customizeColors();
        }

        // Save configuration with route-specific filename
        let fm = FileManager.local();
        let configPath = fm.joinPath(fm.documentsDirectory(), routeInfo.filename);
        let config = {
            departure: departureStations[departureStationIndex],
            arrival: arrivalStations[arrivalStationIndex],
            departureLine: departureLineName,
            arrivalLine: arrivalLineName,
            travelMode: travelMode,
            pageLimit: tripNumArray[tripNumIndex],
            showReturnTrips: returnTripsIndex === 0,
            showTransfers: transfersIndex === 0,
            routeType: routeInfo.name,
            colors: selectedColors
        };
        fm.writeString(configPath, JSON.stringify(config, null, 2));
        
        // Show confirmation
        let confirmAlert = new Alert();
        confirmAlert.title = "Configuration Saved";
        confirmAlert.message = `Route Type: ${routeInfo.name}
Config File: ${routeInfo.filename}
Departure Line: ${config.departureLine}
Departure Station: ${config.departure}
Arrival Line: ${config.arrivalLine}
Arrival Station: ${config.arrival}
Travel Mode: ${config.travelMode}
Number of Trips: ${config.pageLimit}
Show Return Trips: ${config.showReturnTrips ? "Yes" : "No"}
Show Transfers: ${config.showTransfers ? "Yes" : "No"}`;
        confirmAlert.addAction("OK");
        await confirmAlert.presentAlert();
        
    } catch (error) {
        // Show error message
        let errorAlert = new Alert();
        errorAlert.title = "Error";
        errorAlert.message = "An error occurred while saving settings. Please try again.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
    }
}

await configureStations();