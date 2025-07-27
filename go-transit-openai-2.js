// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// AA00ED98YD
async function getTripPlans() {
    // Load config from local file
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
    let departure, arrival;
    let showReturnTrips = false;
    let showTransfers = true;
    let tripLimit = 6;

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        departure = config.departure;
        arrival = config.arrival;
        showReturnTrips = config.showReturnTrips ?? false;
        showTransfers = config.showTransfers ?? true;
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

    // First fetch trips with default limit
    let outboundTrips = await fetchTripPlans(departureID, arrivalID, tripLimit);
    let returnTrips = showReturnTrips ? await fetchTripPlans(arrivalID, departureID, tripLimit) : [];

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
    widget.addText("Go Transit Schedules").font = Font.boldSystemFont(16);

    displayTripPlans(widget, outboundTrips, departure, arrival);
    
    if (showReturnTrips && returnTrips.length > 0) {
        widget.addSpacer(5);
        displayTripPlans(widget, returnTrips, arrival, departure);
    }
    Script.setWidget(widget);
    Script.complete();
}

async function displayTripPlans(widget, tripPlans, departure, arrival) {

    let titleStack = widget.addStack();
    titleStack.layoutVertically();
    
    let stationInfo = titleStack.addText(`${departure} → ${arrival}`);
    stationInfo.font = Font.systemFont(14);
    stationInfo.textColor = Color.blue();

    widget.addSpacer(5);

    if (tripPlans.length > 0) {
        // Sort trips: direct trips first, then by departure time
        tripPlans.sort((a, b) => {
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
            timeStack.addSpacer(5);
            let durationText = timeStack.addText(`(Duration: ${duration})`);
            durationText.font = Font.systemFont(12);
            durationText.textColor = Color.gray();
            
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
                    routeText.textColor = Color.orange();

                    let stationInfo = `${section.DepartureStopName} (${section.DepartureTime.split(' ')[1]})`;
                    stationInfo += ` → ${section.ArrivalStopName} (${section.ArrivalTime.split(' ')[1]})`;
                    let stationText = sectionStack.addText(stationInfo);
                    stationText.font = Font.systemFont(10);
                    stationText.textColor = Color.gray();
                    
                    if (sectionIndex < sections.length - 1) {
                        let transferStack = tripStack.addStack();
                        transferStack.centerAlignContent();
                        let transferText = transferStack.addText("⬇ Transfer ⬇");
                        transferText.font = Font.systemFont(10);
                        transferText.textColor = Color.orange();
                    }
                });
            } else {
                const section = sections[0];
                const transitType = section.TransitType === 1 ? "🚂 (Train)" : "🚌 (Bus)";
                let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber}) - Direct Trip`;
                let routeText = tripStack.addText(routeInfo);
                routeText.font = Font.systemFont(11);
                routeText.textColor = Color.green();
                
                let stationInfo = `${section.DepartureStopName} → ${section.ArrivalStopName}`;
                let stationText = tripStack.addText(stationInfo);
                stationText.font = Font.systemFont(10);
                stationText.textColor = Color.gray();
            }
            
            // If not the last trip, add separator line
            if (index < tripPlans.length - 1) {
                widget.addSpacer(5);
                let separator = widget.addStack();
                separator.backgroundColor = Color.gray();
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

async function fetchTripPlans(departureID, arrivalID, pageLimit = 2) {
    // Get current time and subtract 30 minutes
    let date = new Date();
    date.setMinutes(date.getMinutes() - 30);
    
    // Format date as YYYY-MM-DD_HH-mm
    const formattedDate = `${date.getFullYear()}-${
        String(date.getMonth() + 1).padStart(2, '0')}-${
        String(date.getDate()).padStart(2, '0')}_${
        String(date.getHours()).padStart(2, '0')}-${
        String(date.getMinutes()).padStart(2, '0')}`;
    
    // Load travel mode from config
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
    let travelMode = "All";

    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        travelMode = config.travelMode || "All";
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
