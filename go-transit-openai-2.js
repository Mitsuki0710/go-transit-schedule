// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// AA00ED98YD

// Get widget size and ID
let widgetSize = config.widgetFamily || "medium";
let widgetID = config.widgetID || "default";

async function getTripPlans() {
    // Load config from local file based on widget ID
    let fm = FileManager.local();
    let basePath = fm.documentsDirectory();
    
    // Create separate config files for each widget
    let configPath = fm.joinPath(basePath, `gotransit-config-${widgetID}.json`);
    let fallbackPath = fm.joinPath(basePath, "gotransit-config.json");
    
    let departure, arrival;
    let showReturnTrips = false;
    let showTransfers = true;
    let tripLimit = 6;
    let colors = {
        title: "#000000",
        stationInfo: "#0066CC",
        timeText: "#333333",
        duration: "#666666",
        transferRoute: "#FF6B00",
        directRoute: "#008E44",
        stationDetails: "#707070"
    };

    // Try to load widget-specific config first, then fallback to default
    let configLoaded = false;
    if (fm.fileExists(configPath)) {
        let config = JSON.parse(fm.readString(configPath));
        departure = config.departure;
        arrival = config.arrival;
        showReturnTrips = config.showReturnTrips ?? false;
        showTransfers = config.showTransfers ?? true;
        tripLimit = config.pageLimit || 6;
        colors = config.colors || colors;
        configLoaded = true;
        console.log(`Loaded config for widget ${widgetID}`);
    } else if (fm.fileExists(fallbackPath)) {
        let config = JSON.parse(fm.readString(fallbackPath));
        departure = config.departure;
        arrival = config.arrival;
        showReturnTrips = config.showReturnTrips ?? false;
        showTransfers = config.showTransfers ?? true;
        tripLimit = config.pageLimit || 6;
        colors = config.colors || colors;
        console.log(`Using fallback config for widget ${widgetID}`);
    } else {
        // Default stations
        departure = "Union Station GO";
        arrival = "Unionville GO";
        console.log(`Using default config for widget ${widgetID}`);
    }
    
    // Adjust trip limits based on widget size
    let maxDirectTrips, maxTransferTrips;
    
    if (widgetSize === "large") {
        maxDirectTrips = 3;
        maxTransferTrips = 1;
    } else {
        // medium or small
        maxDirectTrips = 2;
        maxTransferTrips = 0;
    }
    
    let departureID = await fetchTripPointID(departure);
    let arrivalID = await fetchTripPointID(arrival);

    if (!departureID || !arrivalID) {
        console.error("Could not find station IDs");
        return;
    }   

    // First fetch trips with configured limit
    let outboundTrips = await fetchTripPlans(departureID, arrivalID, tripLimit, widgetID);
    let returnTrips = showReturnTrips ? await fetchTripPlans(arrivalID, departureID, tripLimit, widgetID) : [];

    // Filter trips based on transfer preference
    if (!showTransfers) {
        outboundTrips = outboundTrips.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
        returnTrips = returnTrips.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
    }

    // Adjust trip limit based on transfer availability
    if (!showReturnTrips) {
        const hasTransferTrips = outboundTrips.some(trip => trip.sectionDetails.SectionDetail.length > 1);
        tripLimit = hasTransferTrips ? tripLimit - 1 : tripLimit;
        outboundTrips = outboundTrips.slice(0, tripLimit);
    } else {
        // If showing return trips, show 2 trips each way
        outboundTrips = outboundTrips.slice(0, 2);
        returnTrips = returnTrips.slice(0, 2);
    }

    let widget = new ListWidget();
    
    let titleText = widget.addText("Go Transit Schedules");
    titleText.font = Font.boldSystemFont(16);
    titleText.textColor = new Color(colors.title);

    displayTripPlans(widget, outboundTrips, departure, arrival, colors, maxDirectTrips, maxTransferTrips);
    
    if (showReturnTrips && returnTrips.length > 0) {
        widget.addSpacer(5);
        displayTripPlans(widget, returnTrips, arrival, departure, colors, maxDirectTrips, maxTransferTrips);
    }
    Script.setWidget(widget);
    Script.complete();
}

async function displayTripPlans(widget, tripPlans, departure, arrival, colors, maxDirectTrips = 2, maxTransferTrips = 0) {

    let titleStack = widget.addStack();
    titleStack.layoutVertically();
    
    // Separate direct and transfer trips
    let directTrips = tripPlans.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
    let transferTrips = tripPlans.filter(trip => trip.sectionDetails.SectionDetail.length > 1);
    
    // Sort trips by departure time within each category
    directTrips.sort((a, b) => {
        const aTime = new Date(a.DepartureDateTime);
        const bTime = new Date(b.DepartureDateTime);
        return aTime - bTime;
    });
    
    transferTrips.sort((a, b) => {
        const aTime = new Date(a.DepartureDateTime);
        const bTime = new Date(b.DepartureDateTime);
        return aTime - bTime;
    });
    
    // Limit trips based on widget size
    directTrips = directTrips.slice(0, maxDirectTrips);
    transferTrips = transferTrips.slice(0, maxTransferTrips);
    
    // Display station info with trip type information
    let stationInfoText = `${departure} → ${arrival}`;
    if (directTrips.length > 0 && transferTrips.length > 0) {
        stationInfoText += ` (${directTrips.length} Direct, ${transferTrips.length} Transfer)`;
    } else if (directTrips.length > 0) {
        stationInfoText += ` (${directTrips.length} Direct)`;
    } else if (transferTrips.length > 0) {
        stationInfoText += ` (${transferTrips.length} Transfer)`;
    }
    
    let stationInfo = titleStack.addText(stationInfoText);
    stationInfo.font = Font.systemFont(14);
    stationInfo.textColor = new Color(colors.stationInfo);

    widget.addSpacer(5);

    // Display direct trips first
    if (directTrips.length > 0) {
        if (transferTrips.length > 0) {
            let directHeader = widget.addText("🚂 Direct Trips:");
            directHeader.font = Font.boldSystemFont(12);
            directHeader.textColor = new Color(colors.directRoute);
            widget.addSpacer(3);
        }
        
        directTrips.forEach((trip, index) => {
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
            
            // For direct trips, show simplified information
            const section = trip.sectionDetails.SectionDetail[0];
            const transitType = section.TransitType === 1 ? "🚂" : "🚌";
            let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber})`;
            let routeText = tripStack.addText(routeInfo);
            routeText.font = Font.systemFont(11);
            routeText.textColor = new Color(colors.directRoute);
            
            // If not the last direct trip, add separator line
            if (index < directTrips.length - 1) {
                widget.addSpacer(3);
                let separator = widget.addStack();
                separator.backgroundColor = new Color(colors.stationDetails);
                separator.size = new Size(320, 1);
                widget.addSpacer(3);
            }
        });
    }
    
    // Display transfer trips if any
    if (transferTrips.length > 0) {
        if (directTrips.length > 0) {
            widget.addSpacer(5);
        }
        
        let transferHeader = widget.addText("🔄 Transfer Trips:");
        transferHeader.font = Font.boldSystemFont(12);
        transferHeader.textColor = new Color(colors.transferRoute);
        widget.addSpacer(3);
        
        transferTrips.forEach((trip, index) => {
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
            
            // Show transfer details
            const sections = trip.sectionDetails.SectionDetail;
            sections.forEach((section, sectionIndex) => {
                const transitType = section.TransitType === 1 ? "🚂" : "🚌";
                let sectionStack = tripStack.addStack();
                sectionStack.layoutVertically();
                
                let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber})`;
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
            
            // If not the last transfer trip, add separator line
            if (index < transferTrips.length - 1) {
                widget.addSpacer(3);
                let separator = widget.addStack();
                separator.backgroundColor = new Color(colors.stationDetails);
                separator.size = new Size(320, 1);
                widget.addSpacer(3);
            }
        });
    }
    
    // Show message if no trips found
    if (directTrips.length === 0 && transferTrips.length === 0) {
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

async function fetchTripPlans(departureID, arrivalID, defaultPageLimit = 2, widgetID = "default") {
    // Get current time and subtract 30 minutes
    let date = new Date();
    date.setMinutes(date.getMinutes() - 30);
    
    // Format date as YYYY-MM-DD_HH-mm
    const formattedDate = `${date.getFullYear()}-${
        String(date.getMonth() + 1).padStart(2, '0')}-${
        String(date.getDate()).padStart(2, '0')}_${
        String(date.getHours()).padStart(2, '0')}-${
        String(date.getMinutes()).padStart(2, '0')}`;
    
    // Load travel mode and other settings from widget-specific config
    let fm = FileManager.local();
    let basePath = fm.documentsDirectory();
    let configPath = fm.joinPath(basePath, `gotransit-config-${widgetID}.json`);
    let fallbackPath = fm.joinPath(basePath, "gotransit-config.json");
    
    let travelMode = "All";
    let pageLimit = defaultPageLimit;

    if (fm.fileExists(configPath)) {
        let config = JSON.parse(fm.readString(configPath));
        travelMode = config.travelMode || "All";
        pageLimit = config.pageLimit || defaultPageLimit;
    } else if (fm.fileExists(fallbackPath)) {
        let config = JSON.parse(fm.readString(fallbackPath));
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
    
    console.log(`Widget ${widgetID}: ${url}`);
    let req = new Request(url);
    let response = await req.loadJSON();
    return response.Trips?.items || [];
}

await getTripPlans();
