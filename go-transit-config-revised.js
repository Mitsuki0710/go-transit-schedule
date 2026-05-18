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

async function configureStations() {
    try {
        // Step 1: Ask for config name
        let nameAlert = new Alert();
        nameAlert.title = "Config Name";
        nameAlert.message = "Enter a name for this config (e.g. inbound, outbound).\nFile will be saved as gotransit-config-{name}.json";
        nameAlert.addTextField("e.g. inbound", "");
        nameAlert.addAction("Continue");
        nameAlert.addCancelAction("Cancel");
        let nameResult = await nameAlert.presentAlert();
        if (nameResult === -1) return;

        let configName = nameAlert.textFieldValue(0).trim().replace(/[^a-zA-Z0-9_-]/g, "");
        if (!configName) {
            let errAlert = new Alert();
            errAlert.title = "Invalid Name";
            errAlert.message = "Config name cannot be empty or contain special characters. Please try again.";
            errAlert.addAction("OK");
            await errAlert.presentAlert();
            return;
        }
        const configFilename = `gotransit-config-${configName}.json`;

        // Step 2: Select departure line
        let departureLineIndex;
        while (departureLineIndex === undefined) {
            let departureLineAlert = new Alert();
            departureLineAlert.title = "Select Departure Line";
            departureLineAlert.message = "Please select a line";
            Object.keys(stations).forEach(line => departureLineAlert.addAction(line));
            departureLineAlert.addCancelAction("Cancel");
            departureLineIndex = await departureLineAlert.presentSheet();
            if (departureLineIndex === -1) return;
        }

        let departureLineName = Object.keys(stations)[departureLineIndex];
        let departureStations = stations[departureLineName];

        // Step 3: Select departure station
        let departureStationIndex;
        while (departureStationIndex === undefined) {
            let departureStationAlert = new Alert();
            departureStationAlert.title = `Select Departure Station (${departureLineName})`;
            departureStationAlert.message = "Please select a station";
            departureStations.forEach(station => departureStationAlert.addAction(station));
            departureStationAlert.addCancelAction("Cancel");
            departureStationIndex = await departureStationAlert.presentSheet();
            if (departureStationIndex === -1) return;
        }

        // Step 4: Select arrival line
        let arrivalLineIndex;
        while (arrivalLineIndex === undefined) {
            let arrivalLineAlert = new Alert();
            arrivalLineAlert.title = "Select Arrival Line";
            arrivalLineAlert.message = "Please select a line";
            Object.keys(stations).forEach(line => arrivalLineAlert.addAction(line));
            arrivalLineAlert.addCancelAction("Cancel");
            arrivalLineIndex = await arrivalLineAlert.presentSheet();
            if (arrivalLineIndex === -1) return;
        }

        let arrivalLineName = Object.keys(stations)[arrivalLineIndex];
        let arrivalStations = stations[arrivalLineName];

        // Step 5: Select arrival station
        let arrivalStationIndex;
        while (arrivalStationIndex === undefined) {
            let arrivalStationAlert = new Alert();
            arrivalStationAlert.title = `Select Arrival Station (${arrivalLineName})`;
            arrivalStationAlert.message = "Please select a station";
            arrivalStations.forEach(station => arrivalStationAlert.addAction(station));
            arrivalStationAlert.addCancelAction("Cancel");
            arrivalStationIndex = await arrivalStationAlert.presentSheet();
            if (arrivalStationIndex === -1) return;
        }

        // Step 6: Select travel mode
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
            if (modeIndex === -1) return;
        }

        const travelModes = ["All", "Train", "Bus"];
        const travelMode = travelModes[modeIndex];

        // Save config
        let fm = FileManager.local();
        let configPath = fm.joinPath(fm.documentsDirectory(), configFilename);
        let configData = {
            departure: departureStations[departureStationIndex],
            arrival: arrivalStations[arrivalStationIndex],
            departureLine: departureLineName,
            arrivalLine: arrivalLineName,
            travelMode: travelMode
        };
        fm.writeString(configPath, JSON.stringify(configData, null, 2));

        // Confirm
        let confirmAlert = new Alert();
        confirmAlert.title = "Configuration Saved";
        confirmAlert.message = `File: ${configFilename}
Departure: ${configData.departure} (${configData.departureLine})
Arrival:   ${configData.arrival} (${configData.arrivalLine})
Mode:      ${configData.travelMode}

Use "${configName}" as the widget parameter.`;
        confirmAlert.addAction("OK");
        await confirmAlert.presentAlert();

    } catch (error) {
        let errorAlert = new Alert();
        errorAlert.title = "Error";
        errorAlert.message = "An error occurred while saving settings. Please try again.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
    }
}

await configureStations();
