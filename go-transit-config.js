// Configuration script
let stations = ["Union Station GO", "Unionville GO", "Oakville", "Langstaff", "Milton", "Brampton", "Guelph", "Kitchener"];

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
        // Select departure station
        let departureIndex;
        while (departureIndex === undefined) {
            let departureAlert = new Alert();
            departureAlert.title = "Select Departure Station";
            departureAlert.message = "Please select a station";
            stations.forEach(station => departureAlert.addAction(station));
            departureAlert.addCancelAction("Cancel");
            departureIndex = await departureAlert.presentSheet();
            if (departureIndex === -1) {
                return;
            }
        }
        
        // Select arrival station
        let arrivalIndex;
        while (arrivalIndex === undefined) {
            let arrivalAlert = new Alert();
            arrivalAlert.title = "Select Arrival Station";
            arrivalAlert.message = "Please select a station";
            stations.forEach(station => arrivalAlert.addAction(station));
            arrivalAlert.addCancelAction("Cancel");
            arrivalIndex = await arrivalAlert.presentSheet();
            if (arrivalIndex === -1) {
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

        // Save configuration
        let fm = FileManager.local();
        let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
        let config = {
            departure: stations[departureIndex],
            arrival: stations[arrivalIndex],
            travelMode: travelMode,
            pageLimit: tripNumArray[tripNumIndex],
            showReturnTrips: returnTripsIndex === 0,
            showTransfers: transfersIndex === 0,
            colors: selectedColors
        };
        fm.writeString(path, JSON.stringify(config));
        
        // Show confirmation
        let confirmAlert = new Alert();
        confirmAlert.title = "Settings Saved";
        confirmAlert.message = `Departure: ${config.departure}
        Arrival: ${config.arrival}
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