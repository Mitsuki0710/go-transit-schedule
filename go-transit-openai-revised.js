// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// AA00ED98YD

// Color scheme configuration
let colors = {
    title: "#FFFFFF",            // White for title
    stationInfo: "#0066CC",      // Blue for station info
    timeText: "#FFFFFF",         // White for time
    duration: "#666666",         // Gray for duration
    transferRoute: "#FF6B00",    // Orange for transfer routes
    directRoute: "#008E44",      // Green for direct routes
    stationDetails: "#707070",   // Light gray for station details
    separator: "#CCCCCC"         // Light gray for separators
};


const colorSchemes = {
    light: {
        title: "#000000",
        stationInfo: "#0066CC",
        timeText: "#333333",
        duration: "#666666",
        transferRoute: "#FF6B00",        
        directRoute: "#008E44",
        stationDetails: "#666666",
        separator: "#999999"         // Light gray for separators
    },
    dark: {
        title: "#FFFFFF",            // White for title
        stationInfo: "#0066CC",      // Blue for station info
        timeText: "#FFFFFF",         // White for time
        duration: "#666666",         // Gray for duration
        transferRoute: "#FF6B00",    // Orange for transfer routes
        directRoute: "#008E44",      // Green for direct routes
        stationDetails: "#DDDDDD",   // Light gray for station details
        separator: "#CCCCCC"         // Light gray for separators
    }
};

// Get widget size
let widgetSize = config.widgetFamily || "large";


async function getTripPlans() {
    // Load config from local file
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config-work.json");
    let departure, arrival;
    let tripLimit = 3;

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        departure = config.departure;
        arrival = config.arrival;
        // Load custom colors if available
        if (Device.isUsingDarkAppearance()) {
            colors = { ...colorSchemes.dark };
        } else {
            colors = { ...colorSchemes.light };
        }
        // if (config.colors) {
        //     colors = { ...colors, ...config.colors };
        // }
    } else {
        // Default stations
        departure = "Union Station GO";
        arrival = "Unionville GO";
    }
    
    let departureID = await fetchTripPointID(departure);
    let arrivalID = await fetchTripPointID(arrival);

    if (!departureID || !arrivalID) {
        console.error("Could not find station IDs");
        return;
    }   

    // First fetch trips with configured limit
    let allTrips = await fetchTripPlans(departureID, arrivalID, tripLimit);

    if (allTrips.length === 0) {
        widget.addText("No Trip Found.").font = Font.systemFont(12);
        Script.setWidget(widget);
        Script.complete();
        return;
    }

    let outboundTrips = await sortTrips(allTrips);
    
    // Filter trips based on widget size
    if (widgetSize !== "large") {
        // For medium and small widgets, filter out transfer trips to show only direct trips
        outboundTrips = outboundTrips.filter(trip => trip.sectionDetails.SectionDetail.length === 1);
    }

    let widget = new ListWidget();
    
    let titleText = widget.addText("Go Transit Schedules");
    titleText.font = Font.boldSystemFont(16);
    titleText.textColor = new Color(colors.title);

    displayTripPlans(widget, outboundTrips, departure, arrival);
    
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

    let displayedTrips = 0;
    let isLastTrip = false;
    
    for (let index = 0; index < tripPlans.length; index++) {
        const trip = tripPlans[index];
        
        // Get all section information
        const sections = trip.sectionDetails.SectionDetail;
        const hasTransfers = sections.length > 1;
        
        
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
        
        // transfer trips can only be shown if the widget size is large
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
        
        displayedTrips++;
        
        // If not the last trip, add separator line
        if (index !== tripPlans.length - 1) {
            widget.addSpacer(5);
            let separator = widget.addStack();
            separator.backgroundColor = new Color(colors.separator);
            separator.size = new Size(320, 1);
            widget.addSpacer(5);
        }
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

async function fetchTripPlans(departureID, arrivalID, defaultPageLimit = 3) {
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
    // TODO: change the name of the config file
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config-work.json");
    let travelMode = "All";

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        travelMode = config.travelMode || "All";
    }
    
    // Base URL without travel mode
    // https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=2025-04-21&Page=1&PageLimit=3&DepartureTripPointId=36888&DepartureTypeId=4&ArrivalTripPointId=75749&ArrivalTypeId=4
    let url = `https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=${formattedDate}&Page=1&PageLimit=${defaultPageLimit}&DepartureTripPointId=${departureID}&DepartureTypeId=4&ArrivalTripPointId=${arrivalID}&ArrivalTypeId=4`;
    
    // Only append PreferredTravelMode if specific mode is selected
    if (travelMode !== "All") {
        url += `&PreferredTravelMode=${travelMode}`;
    }
    
    console.log(url);
    let req = new Request(url);
    let response = await req.loadJSON();

    return response.Trips?.items || [];
}

async function sortTrips(trips) {
    return trips.sort((a, b) => {
        const aTime = new Date(a.DepartureDateTime);
        const bTime = new Date(b.DepartureDateTime);
        return aTime - bTime;
    });
}

await getTripPlans();
