// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;

const TIMEZONE = "America/Toronto";
const CONFIG_FILE = "gotransit-config-work.json";
const LEGACY_CONFIG_FILE = "gotransit-config.json";
const DEFAULT_DEPARTURE = "Union Station GO";
const DEFAULT_ARRIVAL = "Unionville GO";
const DEFAULT_TRAVEL_MODE = "All";
const MEDIUM_MAX = 4;
const LARGE_MAX = 8;

const widgetFamily = config.widgetFamily
  ? (config.widgetFamily === "large" ? "large" : "medium")
  : "large";

function dc(light, dark) {
  return Color.dynamic(new Color(light), new Color(dark));
}

const C = {
  title: dc("#111111", "#f0f0f0"),
  date: dc("#555555", "#888888"),
  depTime: dc("#111111", "#f0f0f0"),
  depBus: dc("#555555", "#aaaaaa"),
  duration: dc("#999999", "#666666"),
  noSvc: dc("#aaaaaa", "#555555"),
  footer: dc("#bbbbbb", "#555555"),
  badgeTxt: dc("#ffffff", "#ffffff"),
  directBadge: dc("#008E44", "#008E44"),
  transferBadge: dc("#FF6B00", "#FF6B00"),
  busBadge: dc("#666666", "#777777"),
  pillUrgentBg: Color.dynamic(new Color("#ff3b30", 0.15), new Color("#ff3b30", 0.25)),
  pillSoonBg: Color.dynamic(new Color("#ff9500", 0.15), new Color("#ff9500", 0.25)),
  pillOkBg: Color.dynamic(new Color("#34c759", 0.12), new Color("#30d158", 0.18)),
  pillUrgentFg: dc("#d0190c", "#ff453a"),
  pillSoonFg: dc("#c06000", "#ff9f0a"),
  pillOkFg: dc("#1a7a32", "#32d74b"),
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
  const colon = text.match(/^(\d+):(\d{2})$/);
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

function normalizeTrip(trip) {
  const sections = sectionList(trip);
  const first = sections[0] || {};
  const depDate = new Date(trip.DepartureDateTime);
  const depMs = depDate.getTime();
  const hasValidDate = !Number.isNaN(depMs);
  const hasTransfer = sections.length > 1;
  const usesBus = sections.some(isBusSection);
  const type = isBusSection(first) ? "bus" : "train";
  const minsAway = hasValidDate ? Math.round((depMs - Date.now()) / 60000) : 0;

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
    .filter(trip => trip.minsAway >= -1)
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

  return upcoming.slice(0, LARGE_MAX);
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
  w.backgroundColor = Color.dynamic(new Color("#ffffff", 0.72), new Color("#000000", 0.60));

  const grad = new LinearGradient();
  grad.locations = [0, 1];
  grad.colors = [
    Color.dynamic(new Color("#ffffff", 0.10), new Color("#ffffff", 0.06)),
    Color.dynamic(new Color("#ffffff", 0.00), new Color("#ffffff", 0.00)),
  ];
  grad.startPoint = new Point(0, 0);
  grad.endPoint = new Point(0, 1);
  w.backgroundGradient = grad;
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
      depTxt.minimumScaleFactor = 0.8;
      depTxt.lineLimit = 1;

      if (trip.duration) {
        const durTxt = row.addText(trip.duration);
        durTxt.textColor = C.duration;
        durTxt.font = Font.systemFont(durSz);
        durTxt.lineLimit = 1;
      }

      row.addSpacer();

      const away = trip.minsAway;
      const isNow = away <= 1;
      const urgent = away <= 5;
      const soon = away <= 15;
      const pillBg = urgent ? C.pillUrgentBg : soon ? C.pillSoonBg : C.pillOkBg;
      const pillFg = urgent ? C.pillUrgentFg : soon ? C.pillSoonFg : C.pillOkFg;

      const pill = row.addStack();
      pill.backgroundColor = pillBg;
      pill.cornerRadius = 4;
      pill.setPadding(2, 6, 2, 6);
      const pTxt = pill.addText(isNow ? "NOW" : `${away}m`);
      pTxt.textColor = pillFg;
      pTxt.font = Font.boldSystemFont(pillSz);
      pTxt.lineLimit = 1;

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
  w.backgroundColor = Color.dynamic(new Color("#ffffff", 0.72), new Color("#000000", 0.60));
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
