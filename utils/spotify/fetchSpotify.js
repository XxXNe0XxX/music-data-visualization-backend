import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";
import "dotenv/config";

puppeteer.use(StealthPlugin());

// ── Singleton browser + request queue ───────────────────────────────────────
let browserInstance = null;
let launchPromise = null;
let requestQueue = Promise.resolve();

async function getBrowser() {
  // If a launch is already in progress, wait for it
  if (process.env.BROWSERLESS_TOKEN) {
    // Production: use remote Browserless instance
    console.log("Using Browserless");
    return puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
    });
  }
  // Local dev: launch normally
  return puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  if (launchPromise) return launchPromise;

  if (browserInstance) {
    // Verify it's still alive
    try {
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }

  launchPromise = puppeteer
    .launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    .then((browser) => {
      browserInstance = browser;
      launchPromise = null;

      // Clean up reference if browser crashes or is closed externally
      browser.on("disconnected", () => {
        browserInstance = null;
        launchPromise = null;
      });

      return browser;
    })
    .catch((err) => {
      launchPromise = null;
      throw err;
    });

  return launchPromise;
}

// Gracefully close the browser (call on process exit if needed)
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

// Attach to process exit so the browser doesn't linger
process.once("exit", () => {
  browserInstance?.close().catch(() => {});
});
process.once("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});
process.once("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

// ── fetchChartPage now reuses the singleton and queues requests ──────────────
export async function fetchChartPage(countryIso2) {
  // Chain onto the queue so requests execute one-at-a-time
  const result = await (requestQueue = requestQueue.then(async () => {
    const date = new Date();
    date.setDate(date.getDate() - 2);
    const yesterday = date.toISOString().split("T")[0];
    const url = `https://charts.spotify.com/charts/view/regional-${countryIso2.toLowerCase()}-daily/${yesterday}`;

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      const client = await page.createCDPSession();
      await client.send("Network.enable");
      await client.send("Network.setCookie", {
        name: "sp_dc",
        value: process.env.SP_DC,
        domain: ".spotify.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });
      await client.send("Network.setCookie", {
        name: "sp_key",
        value: process.env.SP_KEY,
        domain: ".spotify.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
      await page
        .waitForSelector("table tbody tr", { timeout: 10000 })
        .catch(() => {});

      const html = await page.content();
      return { type: "html", data: html };
    } finally {
      // Always close the page — never the whole browser
      await page.close().catch(() => {});
    }
  }));

  return result;
}

// scrapeChartData and fetchSpotifyData are unchanged below...
export function scrapeChartData(result) {
  // ── API path (fast, complete) ────────────────────────────────────────────
  if (result.type === "api") {
    const entries = result.data?.entries ?? result.data?.chartEntryData ?? [];
    return entries.map((entry, i) => {
      const meta = entry.trackMetadata ?? entry.track ?? {};
      const chartData = entry.chartEntryData ?? entry ?? {};
      const artists = (meta.artists ?? meta.artistNames ?? []).map((a) => ({
        name: typeof a === "string" ? a : a.name,
        url:
          typeof a === "string"
            ? ""
            : (a.external_urls?.spotify ?? a.url ?? ""),
      }));

      return {
        position: chartData.currentRank ?? chartData.rank ?? i + 1,
        positionChange:
          chartData.rankChange > 0
            ? "up"
            : chartData.rankChange < 0
              ? "down"
              : "none",
        trackName: meta.trackName ?? meta.name ?? "",
        trackUrl: meta.externalUrl ?? meta.external_urls?.spotify ?? "",
        trackImageUrl:
          meta.displayImageUri ?? meta.imageUrl ?? meta.images?.[0]?.url ?? "",
        artists,
        peakPosition: chartData.peakRank ?? chartData.peak_rank ?? null,
        weeksOnChart:
          chartData.weeksOnChart ?? chartData.weeks_on_chart ?? null,
        streams: chartData.rankingMetric?.value ?? chartData.streams ?? null,
      };
    });
  }

  // ── HTML fallback path ───────────────────────────────────────────────────
  const $ = cheerio.load(result.data);
  const entries = [];

  $("table tbody tr").each((_, row) => {
    const $row = $(row);

    const positionText = $row
      .find('[aria-label="Current position"]')
      .first()
      .text()
      .trim();
    const position = parseInt(positionText, 10);
    if (isNaN(position)) return;

    const movementBadge =
      $row.find('[aria-label^="Chart position"]').attr("aria-label") || "";
    const positionChange = movementBadge.includes("up")
      ? "up"
      : movementBadge.includes("down")
        ? "down"
        : "none";

    const trackLink = $row.find('a[href*="/track/"]').first();
    const trackUrl = trackLink.attr("href") || "";
    // Extract track name from StyledTruncatedTitle span
    const trackName = $row
      .find('[class*="StyledTruncatedTitle"]')
      .first()
      .text()
      .trim();
    const trackImageUrl = $row.find("img[alt='Track image']").attr("src") || "";

    const artists = [];
    $row.find('a[href*="/artist/"]').each((_, a) => {
      artists.push({
        name: $(a).text().trim(),
        url: $(a).attr("href") || "",
      });
    });

    // Extract all table cells to debug structure
    const allCells = $row
      .find("td")
      .map((_, td) => $(td).text().trim())
      .get();

    // Find the RightTableCell columns
    const rightCells = $row
      .find('[class*="RightTableCell"]')
      .map((_, td) => $(td).text().trim())
      .get();

    // Extract numeric values from right cells
    let peakPosition = null;
    let weeksOnChart = null;
    let streams = null;

    if (rightCells.length >= 4) {
      peakPosition = parseInt(rightCells[0], 10) || null;
      weeksOnChart = parseInt(rightCells[1], 10) || null;
      streams = parseInt((rightCells[3] || "").replace(/,/g, ""), 10) || null;
    }

    entries.push({
      position,
      positionChange,
      trackName,
      trackUrl,
      trackImageUrl,
      artists,
      peakPosition,
      weeksOnChart,
      streams,
    });
  });

  // Limit to 20 songs
  return entries.slice(0, 20);
}
export async function fetchSpotifyData(countryIso2) {
  const result = await fetchChartPage(countryIso2);
  return scrapeChartData(result);
}
