// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;

const TIMEZONE = "America/Toronto";
const DEFAULT_DEPARTURE = "Union Station GO";
const DEFAULT_ARRIVAL = "Unionville GO";
const DEFAULT_TRAVEL_MODE = "All";
const MEDIUM_MAX = 4;
const LARGE_MAX = 8;

const widgetFamily = config.widgetFamily
  ? (config.widgetFamily === "large" ? "large" : "medium")
  : "large";

// Widget parameter selects which config file to load.
// e.g. parameter "inbound"  → gotransit-config-inbound.json
// e.g. parameter "outbound" → gotransit-config-outbound.json
// No parameter              → falls back to legacy gotransit-config-work.json / gotransit-config.json
const widgetParam = (typeof args !== "undefined" && args.widgetParameter)
  ? String(args.widgetParameter).trim().replace(/[^a-zA-Z0-9_-]/g, "")
  : "";
const CONFIG_FILE = widgetParam ? `gotransit-config-${widgetParam}.json` : "gotransit-config-work.json";
const LEGACY_CONFIG_FILE = "gotransit-config.json";


const C = {
  title: new Color("#f0f0f0"),
  date: new Color("#888888"),
  depTime: new Color("#f0f0f0"),
  depBus: new Color("#aaaaaa"),
  duration: new Color("#666666"),
  transferRoute: new Color("#ff9f0a"),
  stationDetails: new Color("#999999"),
  noSvc: new Color("#555555"),
  footer: new Color("#555555"),
  badgeTxt: new Color("#ffffff"),
  directBadge: new Color("#008E44"),
  transferBadge: new Color("#FF6B00"),
  busBadge: new Color("#777777"),
  pillUrgentBg: new Color("#ff3b30", 0.25),
  pillSoonBg: new Color("#ff9500", 0.25),
  pillOkBg: new Color("#30d158", 0.18),
  pillUrgentFg: new Color("#ff453a"),
  pillSoonFg: new Color("#ff9f0a"),
  pillOkFg: new Color("#32d74b"),
};

function torontoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const out = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  if (out.hour === "24") out.hour = "00";
  return out;
}

function torontoDateStr() {
  const p = torontoParts();
  return `${p.year}${p.month}${p.day}`;
}

function apiDateTime(date) {
  const p = torontoParts(date);
  return `${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}`;
}

function updatedAtStr() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function loadRouteConfig() {
  const fm = FileManager.local();
  const docs = fm.documentsDirectory();
  const paths = [
    fm.joinPath(docs, CONFIG_FILE),
    fm.joinPath(docs, LEGACY_CONFIG_FILE),
  ];

  for (const path of paths) {
    if (!fm.fileExists(path)) continue;
    const saved = JSON.parse(fm.readString(path));
    return {
      departure: saved.departure || DEFAULT_DEPARTURE,
      arrival: saved.arrival || DEFAULT_ARRIVAL,
      travelMode: saved.travelMode || DEFAULT_TRAVEL_MODE,
    };
  }

  return {
    departure: DEFAULT_DEPARTURE,
    arrival: DEFAULT_ARRIVAL,
    travelMode: DEFAULT_TRAVEL_MODE,
  };
}

function shortStationName(name) {
  return String(name || "")
    .replace(/\s+GO$/i, "")
    .replace(/\s+Station$/i, "")
    .trim();
}

function shortDuration(value) {
  if (!value) return "";

  const text = String(value).replace(/^Duration:\s*/i, "").trim();
  // Handle HH:MM:SS or HH:MM
  const colon = text.match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (colon) {
    return `${Number(colon[1]) * 60 + Number(colon[2])}m`;
  }

  const hour = text.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/i);
  const min = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
  if (hour || min) {
    const total = (hour ? Number(hour[1]) * 60 : 0) + (min ? Number(min[1]) : 0);
    return `${total}m`;
  }

  return text.replace(/\s+/g, " ");
}

function sectionList(trip) {
  const raw = trip.sectionDetails && trip.sectionDetails.SectionDetail;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function isBusSection(section) {
  return String(section.TransitType) !== "1";
}

function routeBadge(sections) {
  const routes = sections
    .map(section => String(section.LineNumber || "").trim())
    .filter(Boolean);

  if (routes.length === 0) return "GO";
  if (routes.length === 1) return routes[0];
  return `${routes[0]}+${routes.length - 1}`;
}

function compactTime(value) {
  if (!value) return "";

  const text = String(value).trim();
  const timeMatch = text.match(/(\d{1,2}:\d{2})(?::\d{2})?\s*([AP]\.?M\.?)?/i);
  if (timeMatch) {
    const suffix = timeMatch[2]
      ? ` ${timeMatch[2].replace(/\./g, "").toUpperCase()}`
      : "";
    return `${timeMatch[1]}${suffix}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  return text;
}

function sectionMode(section) {
  return isBusSection(section) ? "Bus" : "Train";
}

function sectionRouteText(section) {
  const line = String(section.LineNumber || "GO").trim();
  const tripNo = section.TripNumber ? ` (${section.TripNumber})` : "";
  return `${sectionMode(section)} ${line}${tripNo}`;
}

function sectionStationText(section) {
  const dep = shortStationName(section.DepartureStopName || "");
  const arr = shortStationName(section.ArrivalStopName || "");
  const depTime = compactTime(section.DepartureTime);
  const arrTime = compactTime(section.ArrivalTime);
  const depPart = depTime ? `${dep} ${depTime}` : dep;
  const arrPart = arrTime ? `${arr} ${arrTime}` : arr;
  return `${depPart} -> ${arrPart}`;
}

function parseDepartureDateTime(raw) {
  if (!raw) return new Date(NaN);
  const s = String(raw).trim();
  // If already has timezone info (Z, +HH:MM, -HH:MM), parse as-is
  if (/[Zz]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  // No timezone — API returns local Toronto time; attach the offset manually.
  // We compute the current UTC offset for America/Toronto dynamically so it
  // works for both EST (−05:00) and EDT (−04:00).
  const now = new Date();
  const torontoStr = now.toLocaleString("en-CA", { timeZone: TIMEZONE, hour12: false });
  const utcStr   = now.toLocaleString("en-CA", { timeZone: "UTC",          hour12: false });
  const torontoParsed = new Date(torontoStr.replace(",", ""));
  const utcParsed     = new Date(utcStr.replace(",", ""));
  const offsetMs = utcParsed - torontoParsed;          // positive when behind UTC
  const offsetMin = Math.round(offsetMs / 60000);
  const sign = offsetMin <= 0 ? "+" : "-";
  const abs  = Math.abs(offsetMin);
  const hh   = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm   = String(abs % 60).padStart(2, "0");
  return new Date(`${s}${sign}${hh}:${mm}`);
}

function parseDepartureTimeDisplay(displayStr) {
  // DepartureTimeDisplay is like "16:42" or "4:42 PM" - combine with today Toronto date
  if (!displayStr) return new Date(NaN);
  const p = torontoParts();
  const today = `${p.year}-${p.month}-${p.day}`;
  const m24 = String(displayStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return parseDepartureDateTime(`${today}T${m24[1].padStart(2,"0")}:${m24[2]}:00`);
  }
  const m12 = String(displayStr).trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const mn = m12[2];
    const ampm = m12[3].toUpperCase();
    if (ampm === "AM" && h === 12) h = 0;
    if (ampm === "PM" && h !== 12) h += 12;
    return parseDepartureDateTime(`${today}T${String(h).padStart(2,"0")}:${mn}:00`);
  }
  return new Date(NaN);
}

function normalizeTrip(trip) {
  const sections = sectionList(trip);
  const first = sections[0] || {};
  let depDate = parseDepartureDateTime(trip.DepartureDateTime);
  if (Number.isNaN(depDate.getTime())) {
    depDate = parseDepartureTimeDisplay(trip.DepartureTimeDisplay);
  }
  const depMs = depDate.getTime();
  const hasValidDate = !Number.isNaN(depMs);
  const hasTransfer = sections.length > 1;
  const usesBus = sections.some(isBusSection);
  const type = isBusSection(first) ? "bus" : "train";
  const minsAway = hasValidDate ? Math.round((depMs - Date.now()) / 60000) : null;

  return {
    raw: trip,
    sections,
    departureMs: hasValidDate ? depMs : 0,
    departureTime: trip.DepartureTimeDisplay || "",
    arrivalTime: trip.ArrivalTimeDisplay || "",
    duration: shortDuration(trip.Duration),
    minsAway,
    hasTransfer,
    usesBus,
    type,
    route: routeBadge(sections),
  };
}

function selectTrips(trips, family) {
  const upcoming = trips
    .map(normalizeTrip)
    .filter(trip => trip.minsAway === null || trip.minsAway >= -1)
    .sort((a, b) => a.departureMs - b.departureMs);

  if (family === "medium") {
    const direct = upcoming.filter(trip => !trip.hasTransfer);
    const transfer = upcoming.filter(trip => trip.hasTransfer);
    if (direct.length >= MEDIUM_MAX) {
      return direct.slice(0, MEDIUM_MAX);
    }
    return [...direct, ...transfer]
      .sort((a, b) => a.departureMs - b.departureMs)
      .slice(0, MEDIUM_MAX);
  }

  const selected = [];
  let rowBudget = 0;
  for (const trip of upcoming) {
    const weight = trip.hasTransfer ? 3 : 1;
    if (selected.length > 0 && rowBudget + weight > LARGE_MAX) break;
    selected.push(trip);
    rowBudget += weight;
  }
  return selected;
}

function tripData(rawTrips, routeConfig, family) {
  const trips = selectTrips(rawTrips, family);
  return {
    trips,
    fromName: routeConfig.departure,
    toName: routeConfig.arrival,
    date: torontoDateStr(),
    hasTransfer: trips.some(trip => trip.hasTransfer),
    usesBus: trips.some(trip => trip.usesBus),
  };
}

function addTransitIcon(row, trip, size) {
  const name = trip.type === "bus" ? "bus.fill" : "tram.fill";
  try {
    const icon = row.addImage(SFSymbol.named(name).image);
    icon.imageSize = new Size(size, size);
    icon.tintColor = trip.type === "bus" ? C.depBus : C.depTime;
  } catch (e) {
    const fallback = row.addText(trip.type === "bus" ? "B" : "T");
    fallback.textColor = trip.type === "bus" ? C.depBus : C.depTime;
    fallback.font = Font.boldSystemFont(size);
  }
}

function addTransferDetails(widget, trip, isMedium) {
  if (!trip.hasTransfer) return;

  const routeFont = 10;
  const stationFont = 9;
  const transferFont = 8;
  const indent = 8;

  widget.addSpacer(isMedium ? 2 : 3);

  const detailWrap = widget.addStack();
  detailWrap.layoutHorizontally();
  detailWrap.addSpacer(indent);

  const detailStack = detailWrap.addStack();
  detailStack.layoutVertically();

  trip.sections.forEach((section, index) => {
    const routeText = detailStack.addText(`${sectionRouteText(section)} - Transfers`);
    routeText.font = Font.systemFont(routeFont);
    routeText.textColor = C.transferRoute;
    routeText.lineLimit = 1;
    routeText.minimumScaleFactor = 0.7;

    const stationText = detailStack.addText(sectionStationText(section));
    stationText.font = Font.systemFont(stationFont);
    stationText.textColor = C.stationDetails;
    stationText.lineLimit = 1;
    stationText.minimumScaleFactor = 0.55;

    if (index < trip.sections.length - 1) {
      const transferText = detailStack.addText("Transfer");
      transferText.font = Font.systemFont(transferFont);
      transferText.textColor = C.transferRoute;
      transferText.lineLimit = 1;
    }
  });
}

function buildWidget(data, family) {
  const isMedium = family === "medium";
  const { trips } = data;

  const titleSz = isMedium ? 15 : 16;
  const depSz = isMedium ? 15 : 16;
  const badgeSz = 11;
  const pillSz = isMedium ? 12 : 13;
  const durSz = isMedium ? 12 : 13;
  const rowGap = isMedium ? 6 : 8;
  const topGap = isMedium ? 9 : 11;

  const w = new ListWidget();
  w.backgroundColor = new Color("#000000", 1.0);
  w.setPadding(13, 14, 11, 14);

  const hStack = w.addStack();
  hStack.layoutHorizontally();
  hStack.centerAlignContent();

  const fromShort = shortStationName(data.fromName);
  const toShort = shortStationName(data.toName);
  const titleTxt = hStack.addText(`${fromShort} -> ${toShort}`);
  titleTxt.textColor = C.title;
  titleTxt.font = Font.boldSystemFont(titleSz);
  titleTxt.lineLimit = 1;
  titleTxt.minimumScaleFactor = 0.7;

  hStack.addSpacer();

  const mm = data.date.slice(4, 6);
  const dd = data.date.slice(6, 8);
  const dateTxt = hStack.addText(`${mm}/${dd}`);
  dateTxt.textColor = C.date;
  dateTxt.font = Font.boldSystemFont(10);

  w.addSpacer(topGap);

  if (trips.length === 0) {
    w.addSpacer();
    const noTxt = w.addText("No upcoming trips found");
    noTxt.textColor = C.noSvc;
    noTxt.font = Font.italicSystemFont(12);
    w.addSpacer();
  } else {
    for (const trip of trips) {
      const row = w.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 5;

      const badge = row.addStack();
      if (trip.hasTransfer) {
        badge.backgroundColor = C.transferBadge;
      } else if (trip.type === "bus") {
        badge.backgroundColor = C.busBadge;
      } else {
        badge.backgroundColor = C.directBadge;
      }
      badge.cornerRadius = 3;
      badge.setPadding(2, 5, 2, 5);
      const bTxt = badge.addText(trip.route);
      bTxt.textColor = C.badgeTxt;
      bTxt.font = Font.boldSystemFont(badgeSz);
      bTxt.lineLimit = 1;

      addTransitIcon(row, trip, badgeSz + 1);

      const depTxt = row.addText(trip.departureTime);
      depTxt.textColor = trip.type === "bus" ? C.depBus : C.depTime;
      depTxt.font = Font.boldSystemFont(depSz);
      depTxt.minimumScaleFactor = 1.0;
      depTxt.lineLimit = 1;

      if (trip.duration) {
        const durTxt = row.addText(trip.duration);
        durTxt.textColor = C.duration;
        durTxt.font = Font.systemFont(durSz);
        durTxt.minimumScaleFactor = 1.0;
        durTxt.lineLimit = 1;
      }

      row.addSpacer();

      const away = trip.minsAway;
      const unknown = away === null;
      const isNow = !unknown && away <= 1;
      const urgent = unknown || away <= 5;
      const soon = !unknown && away <= 15;
      const pillBg = urgent ? C.pillUrgentBg : soon ? C.pillSoonBg : C.pillOkBg;
      const pillFg = urgent ? C.pillUrgentFg : soon ? C.pillSoonFg : C.pillOkFg;

      const pill = row.addStack();
      pill.backgroundColor = pillBg;
      pill.cornerRadius = 4;
      pill.setPadding(2, 6, 2, 6);
      const pillLabel = unknown ? "?m" : isNow ? "NOW" : `${away}m`;
      const pTxt = pill.addText(pillLabel);
      pTxt.textColor = pillFg;
      pTxt.font = Font.boldSystemFont(pillSz);
      pTxt.lineLimit = 1;

      addTransferDetails(w, trip, isMedium);

      w.addSpacer(rowGap);
    }
  }

  w.addSpacer();

  const footerParts = [`Updated ${updatedAtStr()}`];
  if (data.hasTransfer) footerParts.push("includes transfers");
  if (data.usesBus) footerParts.push("bus included");
  const footerTxt = w.addText(footerParts.join("   "));
  footerTxt.textColor = C.footer;
  footerTxt.font = Font.systemFont(8);

  return w;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000", 1.0);
  w.setPadding(14, 14, 14, 14);
  const t = w.addText(`GO Transit\n\n${msg}`);
  t.textColor = dc("#cc1100", "#ff453a");
  t.font = Font.systemFont(11);
  t.minimumScaleFactor = 0.6;
  return w;
}

async function fetchTripPointID(stationName) {
  const url = "https://ae72qusyyn-dsn.algolia.net/1/indexes/*/queries";
  const req = new Request(url);
  req.method = "POST";
  req.headers = {
    "content-type": "application/json",
    "x-algolia-api-key": "ddcb3919a54216c7fb2e73f4bf1f1956",
    "x-algolia-application-id": "AE72QUSYYN",
  };

  req.body = JSON.stringify({
    requests: [{
      indexName: "TRIPPOINT_PROD_TR",
      query: stationName,
      params: "hitsPerPage=55&page=0&filters=TRANO = 1 OR ISSTATION = 0",
    }],
  });

  const response = await req.loadJSON();
  return response.results?.[0]?.hits?.[0]?.ID_TRIPPOINT || null;
}

async function fetchTripPlans(departureID, arrivalID, pageLimit, travelMode) {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 30);
  const formattedDate = apiDateTime(date);

  let url = "https://api.metrolinx.com/external/go/tripplanner/search";
  url += `?DateType=DEPARTURE&Date=${formattedDate}`;
  url += `&Page=1&PageLimit=${pageLimit}`;
  url += `&DepartureTripPointId=${departureID}&DepartureTypeId=4`;
  url += `&ArrivalTripPointId=${arrivalID}&ArrivalTypeId=4`;

  if (travelMode && travelMode !== "All") {
    url += `&PreferredTravelMode=${encodeURIComponent(travelMode)}`;
  }

  console.log(url);
  const req = new Request(url);
  const response = await req.loadJSON();
  return response.Trips?.items || [];
}

async function getTripPlans() {
  const routeConfig = loadRouteConfig();
  const [departureID, arrivalID] = await Promise.all([
    fetchTripPointID(routeConfig.departure),
    fetchTripPointID(routeConfig.arrival),
  ]);

  if (!departureID || !arrivalID) {
    throw new Error("Could not find station IDs for the configured route.");
  }

  const pageLimit = widgetFamily === "large" ? LARGE_MAX : Math.max(LARGE_MAX, MEDIUM_MAX + 2);
  const rawTrips = await fetchTripPlans(
    departureID,
    arrivalID,
    pageLimit,
    routeConfig.travelMode,
  );

  return tripData(rawTrips, routeConfig, widgetFamily);
}

async function main() {
  try {
    const data = await getTripPlans();
    const widget = buildWidget(data, widgetFamily);
    Script.setWidget(widget);

    if (!config.runsInWidget) {
      widgetFamily === "medium" ? await widget.presentMedium() : await widget.presentLarge();
    }
  } catch (e) {
    const widget = errorWidget(e.message);
    Script.setWidget(widget);
    if (!config.runsInWidget) {
      widgetFamily === "medium" ? await widget.presentMedium() : await widget.presentLarge();
    }
  }
}

await main();
Script.complete();
