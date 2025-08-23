// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// AA00ED98YD

// Color scheme configuration
let colors = {
    title: "#000000",
    stationInfo: "#0066CC",      // Blue for station info
    timeText: "#333333",         // Dark gray for time
    duration: "#666666",         // Gray for duration
    transferRoute: "#FF6B00",    // Orange for transfer routes
    directRoute: "#008E44",      // Green for direct routes
    stationDetails: "#707070",   // Light gray for station details
    separator: "#CCCCCC"         // Light gray for separators
};

// Get widget size
let widgetSize = config.widgetFamily || "medium";

async function getTripPlans() {
    // Load config from local file
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
    let departure, arrival;
    let showTransfers = false;  // Default to false, user can enable
    let tripLimit = 6;  // Always fetch 6 trips

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        departure = config.departure;
        arrival = config.arrival;
        showTransfers = config.showTransfers ?? false;  // Load from config, default false
        // Load custom colors if available
        if (config.colors) {
            colors = { ...colors, ...config.colors };
        }
    } else {
        // Default stations
        departure = "Union Station GO";
        arrival = "Unionville GO";
    }
    
    // Determine display limits based on widget size
    let maxDisplayTrips;
    let maxTransferTrips;
    
    if (widgetSize === "large") {
        maxDisplayTrips = 4;
        maxTransferTrips = showTransfers ? 1 : 0;
    } else if (widgetSize === "medium") {
        maxDisplayTrips = 4;
        maxTransferTrips = showTransfers ? 1 : 0;
    } else {
        // small widget
        maxDisplayTrips = 2;
        maxTransferTrips = showTransfers ? 1 : 0;
    }
    
    let departureID = await fetchTripPointID(departure);
    let arrivalID = await fetchTripPointID(arrival);

    if (!departureID || !arrivalID) {
        console.error("Could not find station IDs");
        return;
    }   

    // Always fetch 6 trips
    let allTrips = await fetchTripPlans(departureID, arrivalID, tripLimit);

    // Filter trips based on transfer preference
    if (!showTransfers) {
        allTrips = allTrips.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
    }

    // Sort trips: direct trips first, then by departure time
    allTrips.sort((a, b) => {
        const aIsDirect = a.sectionDetails.SectionDetail.length === 1;
        const bIsDirect = b.sectionDetails.SectionDetail.length === 1;
        
        // If direct status is different, direct trips first
        if (aIsDirect !== bIsDirect) {
            return aIsDirect ? -1 : 1;
        }
        
        // If direct status is the same, sort by departure time
        const aTime = new Date(a.DepartureDateTime);
        const bTime = new Date(b.DepartureDateTime);
        return aTime - bTime;
    });

    // Select trips to display based on widget size and transfer preference
    let displayTrips = [];
    let directTrips = allTrips.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
    let transferTrips = allTrips.filter(trip => trip.sectionDetails.SectionDetail.length > 1);

    if (showTransfers && transferTrips.length > 0) {
        // Include transfer trips if enabled and available
        if (maxTransferTrips > 0) {
            displayTrips.push(...transferTrips.slice(0, maxTransferTrips));
        }
        // Fill remaining slots with direct trips
        let remainingSlots = maxDisplayTrips - displayTrips.length;
        if (remainingSlots > 0 && directTrips.length > 0) {
            displayTrips.push(...directTrips.slice(0, remainingSlots));
        }
    } else {
        // Only show direct trips
        displayTrips = directTrips.slice(0, maxDisplayTrips);
    }

    let widget = new ListWidget();
    
    let titleText = widget.addText("Go Transit Schedules");
    titleText.font = Font.boldSystemFont(16);
    titleText.textColor = new Color(colors.title);

    displayTripPlans(widget, displayTrips, departure, arrival);
    
    Script.setWidget(widget);
    Script.complete();
}

async function displayTripPlans(widget, tripPlans, departure, arrival) {

    let titleStack = widget.addStack();
    titleStack.layoutVertically();
    
    let stationInfo = titleStack.addText(`${departure} → ${arrival}`);
    stationInfo.font = Font.systemFont(14);
    stationInfo.textColor = new Color(colors.stationInfo);

    widget.addSpacer(5);

    if (tripPlans.length > 0) {
        // Trips are already sorted in getTripPlans function

        tripPlans.forEach((trip, index) => {
            let tripStack = widget.addStack();
            tripStack.layoutVertically();
            
            // Basic information
            const departureTime = trip.DepartureTimeDisplay;
            const arrivalTime = trip.ArrivalTimeDisplay;
            const duration = trip.Duration;
            
            // Add stack for time and duration information
            let timeStack = tripStack.addStack();
            timeStack.centerAlignContent();
            
            let timeText = timeStack.addText(`${departureTime} → ${arrivalTime}`);
            timeText.font = Font.boldSystemFont(13);
            timeText.textColor = new Color(colors.timeText);
            timeStack.addSpacer(5);
            let durationText = timeStack.addText(`(Duration: ${duration})`);
            durationText.font = Font.systemFont(12);
            durationText.textColor = new Color(colors.duration);
            
            // Get all section information
            const sections = trip.sectionDetails.SectionDetail;
            const hasTransfers = sections.length > 1;
            
            if (hasTransfers) {
                sections.forEach((section, sectionIndex) => {
                    const transitType = section.TransitType === 1 ? "🚂 (Train)" : "🚌 (Bus)";
                    let sectionStack = tripStack.addStack();
                    sectionStack.layoutVertically();
                    
                    let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber}) - Transfers`;
                    let routeText = sectionStack.addText(routeInfo);
                    routeText.font = Font.systemFont(11);
                    routeText.textColor = new Color(colors.transferRoute);

                    let stationInfo = `${section.DepartureStopName} (${section.DepartureTime.split(' ')[1]})`;
                    stationInfo += ` → ${section.ArrivalStopName} (${section.ArrivalTime.split(' ')[1]})`;
                    let stationText = sectionStack.addText(stationInfo);
                    stationText.font = Font.systemFont(10);
                    stationText.textColor = new Color(colors.stationDetails);
                    
                    if (sectionIndex < sections.length - 1) {
                        let transferStack = tripStack.addStack();
                        transferStack.centerAlignContent();
                        let transferText = transferStack.addText("⬇ Transfer ⬇");
                        transferText.font = Font.systemFont(10);
                        transferText.textColor = new Color(colors.transferRoute);
                    }
                });
            } else {
                const section = sections[0];
                const transitType = section.TransitType === 1 ? "🚂 (Train)" : "🚌 (Bus)";
                let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber}) - Direct Trip`;
                let routeText = tripStack.addText(routeInfo);
                routeText.font = Font.systemFont(11);
                routeText.textColor = new Color(colors.directRoute);
                
                let stationInfo = `${section.DepartureStopName} → ${section.ArrivalStopName}`;
                let stationText = tripStack.addText(stationInfo);
                stationText.font = Font.systemFont(10);
                stationText.textColor = new Color(colors.stationDetails);
            }
            
            // If not the last trip, add separator line
            if (index < tripPlans.length - 1) {
                widget.addSpacer(5);
                let separator = widget.addStack();
                separator.backgroundColor = new Color(colors.separator);
                separator.size = new Size(320, 1);
                widget.addSpacer(5);
            }
        });
    } else {
        widget.addText("No Trip Found.").font = Font.systemFont(12);
    }
}

async function fetchTripPointID(stationName) {

    let url = "https://ae72qusyyn-dsn.algolia.net/1/indexes/*/queries";
    let req = new Request(url);
    req.method = "POST";
    req.headers = {
        "content-type": "application/json",
        "x-algolia-api-key": "ddcb3919a54216c7fb2e73f4bf1f1956",
        "x-algolia-application-id": "AE72QUSYYN"
    };
    
    req.body = JSON.stringify({
        requests: [{
            indexName: "TRIPPOINT_PROD_TR",
            query: stationName,
            params: "hitsPerPage=55&page=0&filters=TRANO = 1 OR ISSTATION = 0"
        }]
    });

    let response = await req.loadJSON();
    return response.results?.[0]?.hits?.[0]?.ID_TRIPPOINT || null;
}

async function fetchTripPlans(departureID, arrivalID, defaultPageLimit = 2) {
    // Get current time and subtract 30 minutes
    let date = new Date();
    date.setMinutes(date.getMinutes() - 30);
    
    // Format date as YYYY-MM-DD_HH-mm
    const formattedDate = `${date.getFullYear()}-${
        String(date.getMonth() + 1).padStart(2, '0')}-${
        String(date.getDate()).padStart(2, '0')}_${
        String(date.getHours()).padStart(2, '0')}-${
        String(date.getMinutes()).padStart(2, '0')}`;
    
    // Load travel mode and other settings from config
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
    let travelMode = "All";
    let pageLimit = defaultPageLimit;

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        travelMode = config.travelMode || "All";
        pageLimit = config.pageLimit || defaultPageLimit;
    }
    
    // Base URL without travel mode
    // https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=2025-04-21&Page=1&PageLimit=3&DepartureTripPointId=36888&DepartureTypeId=4&ArrivalTripPointId=75749&ArrivalTypeId=4
    let url = `https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=${formattedDate}&Page=1&PageLimit=${pageLimit}&DepartureTripPointId=${departureID}&DepartureTypeId=4&ArrivalTripPointId=${arrivalID}&ArrivalTypeId=4`;
    
    // Only append PreferredTravelMode if specific mode is selected
    if (travelMode !== "All") {
        url += `&PreferredTravelMode=${travelMode}`;
    }
    
    console.log(url);
    let req = new Request(url);
    let response = await req.loadJSON();
    return response.Trips?.items || [];
}

await getTripPlans();
