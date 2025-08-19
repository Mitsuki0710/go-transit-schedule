// Widget Configuration Manager for Go Transit Widgets
// This script helps you create and manage separate configurations for different widgets

// Get widget ID from config
let widgetID = config.widgetID || "default";

async function createWidgetConfig() {
    let fm = FileManager.local();
    let basePath = fm.documentsDirectory();
    let configPath = fm.joinPath(basePath, `gotransit-config-${widgetID}.json`);
    
    // Default configuration template
    let defaultConfig = {
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
    };
    
    // Check if config already exists
    if (fm.fileExists(configPath)) {
        let existingConfig = JSON.parse(fm.readString(configPath));
        let alert = new Alert();
        alert.title = `Widget ${widgetID} Configuration Exists`;
        alert.message = "Do you want to overwrite the existing configuration?";
        alert.addAction("Overwrite");
        alert.addAction("Cancel");
        
        let response = await alert.presentAlert();
        if (response === 0) {
            // Overwrite existing config
            fm.writeString(configPath, JSON.stringify(defaultConfig, null, 2));
            console.log(`Widget ${widgetID} configuration updated`);
        } else {
            console.log("Operation cancelled");
            return;
        }
    } else {
        // Create new config
        fm.writeString(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Widget ${widgetID} configuration created`);
    }
    
    // Show success message
    let alert = new Alert();
    alert.title = "Configuration Created Successfully";
    alert.message = `Widget ${widgetID} configuration file created at:\n${configPath}`;
    alert.addAction("OK");
    await alert.presentAlert();
}

async function listWidgetConfigs() {
    let fm = FileManager.local();
    let basePath = fm.documentsDirectory();
    let files = fm.listContents(basePath);
    
    let configFiles = files.filter(file => file.startsWith("gotransit-config-") && file.endsWith(".json"));
    
    if (configFiles.length === 0) {
        console.log("No widget configuration files found");
        return;
    }
    
    console.log("Found widget configuration files:");
    configFiles.forEach(file => {
        let widgetID = file.replace("gotransit-config-", "").replace(".json", "");
        console.log(`- Widget ID: ${widgetID}`);
        
        // Read and display config details
        let configPath = fm.joinPath(basePath, file);
        let config = JSON.parse(fm.readString(configPath));
        console.log(`  Departure: ${config.departure}`);
        console.log(`  Arrival: ${config.arrival}`);
        console.log(`  Show Return Trips: ${config.showReturnTrips ? "Yes" : "No"}`);
        console.log(`  Show Transfers: ${config.showTransfers ? "Yes" : "No"}`);
        console.log("---");
    });
}

async function deleteWidgetConfig() {
    let fm = FileManager.local();
    let basePath = fm.documentsDirectory();
    let configPath = fm.joinPath(basePath, `gotransit-config-${widgetID}.json`);
    
    if (fm.fileExists(configPath)) {
        let alert = new Alert();
        alert.title = "Delete Configuration";
        alert.message = `Are you sure you want to delete the configuration for Widget ${widgetID}?`;
        alert.addAction("Delete");
        alert.addAction("Cancel");
        
        let response = await alert.presentAlert();
        if (response === 0) {
            fm.remove(configPath);
            console.log(`Widget ${widgetID} configuration deleted`);
            
            let successAlert = new Alert();
            successAlert.title = "Delete Successful";
            successAlert.message = `Widget ${widgetID} configuration file deleted`;
            successAlert.addAction("OK");
            await successAlert.presentAlert();
        }
    } else {
        let alert = new Alert();
        alert.title = "File Not Found";
        alert.message = `Widget ${widgetID} configuration file does not exist`;
        alert.addAction("OK");
        await alert.presentAlert();
    }
}

async function showMainMenu() {
    let alert = new Alert();
    alert.title = "Widget Configuration Manager";
    alert.message = `Current Widget ID: ${widgetID}\n\nSelect operation:`;
    alert.addAction("Create/Update Config");
    alert.addAction("List All Configs");
    alert.addAction("Delete Current Config");
    alert.addAction("Cancel");
    
    let response = await alert.presentAlert();
    
    switch (response) {
        case 0:
            await createWidgetConfig();
            break;
        case 1:
            await listWidgetConfigs();
            break;
        case 2:
            await deleteWidgetConfig();
            break;
        case 3:
            console.log("Operation cancelled");
            break;
    }
}

// Run the configuration manager
await showMainMenu(); 