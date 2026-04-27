import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import "dotenv/config";

puppeteer.use(StealthPlugin());

const CHARTS_BASE_URL =
  "https://charts-spotify-com-service.spotify.com/auth/v0/charts";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function getChartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  return date.toISOString().split("T")[0];
}

export async function getWebAccessToken() {
  const spDc = process.env.SP_DC?.trim();
  if (!spDc) throw new Error("SP_DC must be set in .env");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    let capturedToken = null;
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const auth = req.headers()["authorization"];
      if (auth?.startsWith("Bearer ") && !capturedToken) {
        capturedToken = auth.replace("Bearer ", "");
      }
      req.continue();
    });

    await page.setCookie({
      name: "sp_dc",
      value: spDc,
      domain: ".spotify.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    await page.goto("https://open.spotify.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    if (!capturedToken) {
      throw new Error(
        "No Bearer token intercepted from web player. " +
          "SP_DC may be expired — refresh it from Chrome DevTools > Application > Cookies > open.spotify.com."
      );
    }

    return capturedToken;
  } finally {
    await browser.close();
  }
}

export async function fetchSpotifyChartsByToken(token, countryIso2 = "at") {
  const date = getChartDate();
  const chartId = `regional-${countryIso2.toLowerCase()}-daily`;
  const url = `${CHARTS_BASE_URL}/${chartId}/${date}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": UA,
      Accept: "application/json",
      Origin: "https://charts.spotify.com",
      Referer: "https://charts.spotify.com/",
    },
  });

  return response.data;
}

export async function fetchSpotifyCharts(countryIso2 = "at") {
  const token = await getWebAccessToken();
  return fetchSpotifyChartsByToken(token, countryIso2);
}
