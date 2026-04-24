import * as cheerio from "cheerio";

const ISO2_TO_SLUG = {
  US: "united-states",
  GB: "united-kingdom",
  AR: "argentina",
  AU: "australia",
  AT: "austria",
  BS: "bahamas",
  BH: "bahrain",
  BD: "bangladesh",
  BE: "belgium",
  BO: "bolivia",
  BR: "brazil",
  BG: "bulgaria",
  CA: "canada",
  CL: "chile",
  CO: "colombia",
  CR: "costa-rica",
  HR: "croatia",
  CY: "cyprus",
  CZ: "czech-republic",
  DK: "denmark",
  DO: "dominican-republic",
  EC: "ecuador",
  EG: "egypt",
  SV: "el-salvador",
  EE: "estonia",
  FI: "finland",
  FR: "france",
  DE: "germany",
  GR: "greece",
  GP: "guadeloupe",
  GT: "guatemala",
  HN: "honduras",
  HK: "hong-kong",
  HU: "hungary",
  IS: "iceland",
  IN: "india",
  ID: "indonesia",
  IE: "ireland",
  IL: "israel",
  IT: "italy",
  JM: "jamaica",
  JP: "japan",
  JO: "jordan",
  KE: "kenya",
  KW: "kuwait",
  LV: "latvia",
  LB: "lebanon",
  LT: "lithuania",
  LU: "luxembourg",
  MY: "malaysia",
  MV: "maldives",
  MT: "malta",
  MQ: "martinique",
  MU: "mauritius",
  MX: "mexico",
  MA: "morocco",
  NL: "netherlands",
  NC: "new-caledonia",
  NZ: "new-zealand",
  NI: "nicaragua",
  NG: "nigeria",
  NO: "norway",
  OM: "oman",
  PK: "pakistan",
  PA: "panama",
  PY: "paraguay",
  PE: "peru",
  PH: "philippines",
  PL: "poland",
  PT: "portugal",
  QA: "qatar",
  RO: "romania",
  RE: "reunion",
  SA: "saudi-arabia",
  RS: "serbia",
  SG: "singapore",
  SK: "slovakia",
  SI: "slovenia",
  ZA: "south-africa",
  KR: "south-korea",
  ES: "spain",
  LK: "sri-lanka",
  SE: "sweden",
  CH: "switzerland",
  TW: "taiwan",
  TH: "thailand",
  TT: "trinidad-and-tobago",
  TR: "turkiye",
  UA: "ukraine",
  AE: "united-arab-emirates",
  UY: "uruguay",
  VE: "venezuela",
  VN: "vietnam",
  GLOBAL: "global",
};

export async function fetchNetflixTop10(countryIso2 = "US", type = "movies") {
  const slug = ISO2_TO_SLUG[countryIso2.toUpperCase()];
  if (!slug) throw new Error(`Unknown country ISO2: ${countryIso2}`);

  // movies → /united-states   |   shows → /united-states/tv
  const suffix = type === "shows" ? "/tv" : "";
  const url = `https://www.netflix.com/tudum/top10/${slug}${suffix}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      // This is the key line — matches exactly what a browser sends
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return parseNetflixTop10(await res.text(), type);
}

// Strip ": Season X", ": Limited Series", ": Season X, Part Y" etc.
function stripSuffix(title = "") {
  return title
    .replace(
      /:\s*(Season\s*\d+.*|Limited Series.*|Series\s*\d+.*|\d{4}.*)$/i,
      "",
    )
    .trim();
}

function parseNetflixTop10(html, type = "movies") {
  const $ = cheerio.load(html);
  const results = [];

  const heading = type === "movies" ? "Movies" : "Shows";
  let inTargetSection = false;

  $("h2, ul li").each((_, el) => {
    const tag = el.name;

    if (tag === "h2") {
      inTargetSection = $(el).text().includes(heading);
      return;
    }
    if (!inTargetSection || tag !== "li") return;

    const $li = $(el);

    // ── Rank ──
    const rankText = $li
      .find("p, span")
      .filter((_, n) => /^#\d+/.test($(n).text()))
      .first()
      .text()
      .trim();
    const position = parseInt(rankText.replace("#", ""), 10);

    // ── Title ──
    const rawTitle = $li.find("img").first().attr("alt") || "";
    const title = stripSuffix(rawTitle);
    const seasonLabel = rawTitle.match(/:\s*(.+)$/)?.[1]?.trim() || null;

    // ── Images: prefer card art, fall back to title image ──
    const cardStyle = $li.find('[data-uia="top10-card"]').attr("style") || "";
    const titleImageUrl =
      cardStyle.match(/url\("([^"]+)"\)/)?.[1] ||
      $li.find("img").first().attr("src") ||
      "";
    const imageUrl =
      cardStyle.match(/url\(["&quot;]*([^"&)]+)["&quot;]*\)/)?.[1] ||
      $li.find("img").first().attr("src") ||
      "";
    // ── Watch link ──
    const watchHref = $li.find('a[href*="/watch/"]').first().attr("href") || "";
    const watchId = watchHref.match(/\/watch\/(\d+)/)?.[1] || null;
    const watchUrl = watchId ? `https://www.netflix.com/watch/${watchId}` : "";
    // function toProxiedUrl(imageUrl) {
    //   if (!imageUrl) return "";
    //   return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    // }
    if (title) {
      results.push({
        position: isNaN(position) ? results.length + 1 : position,
        title,
        seasonLabel,
        // imageUrl: toProxiedUrl(imageUrl),
        imageUrl,
        titleImageUrl,
        watchUrl,
        watchId,
        weeksOnChart: null,
      });
    }
  });

  // ── Table: always present, reliable for rank + weeksOnChart ──
  const tableRows = [];
  $("table tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((_, td) => $(td).text().trim())
      .get();
    const rankMatch = cells[0]?.match(/^(\d+)/);
    if (!rankMatch) return;
    tableRows.push({
      position: parseInt(rankMatch[1], 10),
      title: stripSuffix(cells[0].replace(/^\d+/, "").trim()),
      weeksOnChart: parseInt(cells[1], 10) || null,
    });
  });

  if (results.length === 0) {
    // Table-only fallback (no images/watchUrl available)
    tableRows.forEach((r) =>
      results.push({
        ...r,
        seasonLabel: null,
        imageUrl: "",
        titleImageUrl: "",
        watchUrl: "",
        watchId: null,
      }),
    );
  } else {
    // Enrich li results with weeksOnChart from table
    tableRows.forEach(({ position, weeksOnChart }) => {
      const entry = results.find((r) => r.position === position);
      if (entry) entry.weeksOnChart = weeksOnChart;
    });
  }

  return results.slice(0, 10);
}

// fetchNetflixTop10("US", "shows");
