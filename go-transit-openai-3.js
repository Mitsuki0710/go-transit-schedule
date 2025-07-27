// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: magic;
// AA00ED98YD
async function getTripPlans() {
        // 从存储中读取配置
    let fm = FileManager.local();
    let path = fm.joinPath(fm.documentsDirectory(), "gotransit-config.json");
    let departure, arrival;
    
    if (fm.fileExists(path)) {
        let config = JSON.parse(fm.readString(path));
        departure = config.departure;
        arrival = config.arrival;
    } else {
        // 默认站点
        departure = "Union Station GO";
        arrival = "Unionville GO";
    }
    
    let departureID = await fetchTripPointID(departure);
    let arrivalID = await fetchTripPointID(arrival);

    if (!departureID || !arrivalID) {
        console.error("Could not find station IDs");
        return;
    }

    let tripPlans = await fetchTripPlans(departureID, arrivalID);

    let widget = new ListWidget();
    widget.addText("Go Train Trip Plans").font = Font.boldSystemFont(16);

    console.log(`${departure} -> ${arrival}`);
    console.log(`${departureID} -> ${arrivalID}`);
    console.log(tripPlans);

    displayTripPlans(widget, tripPlans, departure, arrival);

    Script.setWidget(widget);
    Script.complete();
}

async function displayTripPlans(widget, tripPlans, departure, arrival) {
    if (tripPlans.length > 0) {
        // 对行程进行排序：直达优先，时间其次
        tripPlans.sort((a, b) => {
            const aIsDirect = a.sectionDetails.SectionDetail.length === 1;
            const bIsDirect = b.sectionDetails.SectionDetail.length === 1;
            
            // 如果直达状态不同，直达优先
            if (aIsDirect !== bIsDirect) {
                return aIsDirect ? -1 : 1;
            }
            
            // 如果直达状态相同，按出发时间排序
            const aTime = new Date(a.DepartureDateTime);
            const bTime = new Date(b.DepartureDateTime);
            return aTime - bTime;
        });

        let titleStack = widget.addStack();
        titleStack.layoutVertically();
        
        let titleText = titleStack.addText("GO Transit 时刻表");
        titleText.font = Font.boldSystemFont(16);
        
        let stationInfo = `${departure} → ${arrival}`;
        let stationText = titleStack.addText(stationInfo);
        stationText.font = Font.systemFont(12);
        stationText.textColor = Color.blue();
        
        widget.addSpacer(10);
    
        if (tripPlans.length > 0) {
            tripPlans.forEach((trip, index) => {
                let tripStack = widget.addStack();
                tripStack.layoutVertically();
                
                // 基本信息
                const departureTime = trip.DepartureTimeDisplay;
                const arrivalTime = trip.ArrivalTimeDisplay;
                const duration = trip.Duration;
                
                // 添加时间和持续时间信息的堆栈
                let timeStack = tripStack.addStack();
                timeStack.centerAlignContent();
                
                let timeText = timeStack.addText(`${departureTime} → ${arrivalTime}`);
                timeText.font = Font.boldSystemFont(13);
                timeStack.addSpacer(5);
                let durationText = timeStack.addText(`(${duration})`);
                durationText.font = Font.systemFont(12);
                durationText.textColor = Color.gray();
                
                // 获取所有段落信息
                const sections = trip.sectionDetails.SectionDetail;
                const hasTransfers = sections.length > 1;
                
                if (hasTransfers) {
                    sections.forEach((section, sectionIndex) => {
                        const transitType = section.TransitType === 1 ? "🚂" : "🚌";
                        let sectionStack = tripStack.addStack();
                        sectionStack.layoutVertically();
                        
                        let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber})`;
                        let routeText = sectionStack.addText(routeInfo);
                        routeText.font = Font.systemFont(11);
                        
                        let stationInfo = `${section.DepartureStopName} (${section.DepartureTime.split(' ')[1]})`;
                        stationInfo += `\n→ ${section.ArrivalStopName} (${section.ArrivalTime.split(' ')[1]})`;
                        let stationText = sectionStack.addText(stationInfo);
                        stationText.font = Font.systemFont(10);
                        stationText.textColor = Color.gray();
                        
                        if (sectionIndex < sections.length - 1) {
                            let transferStack = tripStack.addStack();
                            transferStack.centerAlignContent();
                            let transferText = transferStack.addText("⬇ 换乘 ⬇");
                            transferText.font = Font.systemFont(10);
                            transferText.textColor = Color.orange();
                        }
                    });
                } else {
                    const section = sections[0];
                    const transitType = section.TransitType === 1 ? "🚂" : "🚌";
                    let routeInfo = `${transitType} ${section.LineNumber} (${section.TripNumber})`;
                    let routeText = tripStack.addText(routeInfo);
                    routeText.font = Font.systemFont(11);
                    
                    let stationInfo = `${section.DepartureStopName} → ${section.ArrivalStopName}`;
                    let stationText = tripStack.addText(stationInfo);
                    stationText.font = Font.systemFont(10);
                    stationText.textColor = Color.gray();
                }
                
                // 如果不是最后一个行程，添加分隔线
                if (index < tripPlans.length - 1) {
                    widget.addSpacer(5);
                    let separator = widget.addStack();
                    separator.backgroundColor = Color.gray();
                    separator.size = new Size(200, 1);
                    widget.addSpacer(5);
                }
            });
        } else {
            widget.addText("未找到行程").font = Font.systemFont(12);
        }
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

async function fetchTripPlans(departureID, arrivalID) {
    // let url = `https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=${new Date().toISOString().split('T')[0]}_00-00&Page=1&PageLimit=3&DepartureTripPointId=${departureID}&DepartureTypeId=4&ArrivalTripPointId=${arrivalID}&ArrivalTypeId=4&PreferredTravelMode=Train`;
    let url = `https://api.gotransit.com/v2/tripplanner/search?DateType=DEPARTURE&Date=2025-03-02_00-00&Page=1&PageLimit=3&DepartureTripPointId=36888&DepartureTypeId=4&ArrivalTripPointId=75749&ArrivalTypeId=4`;
    console.log(url);
    let req = new Request(url);
    let response = await req.loadJSON();
    return response.Trips?.items || [];
}

await getTripPlans();
