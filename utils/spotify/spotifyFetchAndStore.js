import fs from "fs-extra";
import path from "path";
import schedule from "node-schedule";
import { countryPlaylist } from "../../data/top50SpotifyPlaylist.js";
import { getWebAccessToken, fetchSpotifyChartsByToken, getChartDate } from "./spotifyChartsFetch.js";
import { logger } from "../../config/winstonConfig.js";

const OUTPUT_DIR = path.resolve("processed");
export const SPOTIFY_CHARTS_PATH = path.join(OUTPUT_DIR, "latest-spotify-charts.json");

function mapTop10(entries) {
  return entries.slice(0, 10).map((entry) => {
    const { chartEntryData, trackMetadata } = entry;
    return {
      rank: chartEntryData.currentRank,
      previousRank: chartEntryData.previousRank,
      peakRank: chartEntryData.peakRank,
      entryStatus: chartEntryData.entryStatus,
      streams: Number(chartEntryData.rankingMetric.value),
      trackId: trackMetadata.trackUri.split(":").pop(),
      trackName: trackMetadata.trackName,
      imageUrl: trackMetadata.displayImageUri,
      releaseDate: trackMetadata.releaseDate,
      artists: trackMetadata.artists.map((a) => ({
        name: a.name,
        id: a.spotifyUri.split(":").pop(),
      })),
      labels: trackMetadata.labels.map((l) => l.name),
    };
  });
}

export async function fetchAndStoreSpotifyCharts() {
  const countries = Object.keys(countryPlaylist);
  const date = getChartDate();

  logger.info(`Spotify charts fetch started — ${countries.length} countries, date: ${date}`);
  logger.info("Launching browser to obtain Spotify web token...");

  const token = await getWebAccessToken();
  logger.info("Token acquired. Starting country fetch loop.");

  const results = {};
  let success = 0;
  let failed = 0;

  for (const country of countries) {
    try {
      const chartData = await fetchSpotifyChartsByToken(token, country);
      results[country.toLowerCase()] = mapTop10(chartData.entries);
      success++;
      logger.info(`[${success + failed}/${countries.length}] ${country} — OK`);
    } catch (error) {
      failed++;
      logger.warn(`[${success + failed}/${countries.length}] ${country} — FAILED: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeJSON(SPOTIFY_CHARTS_PATH, { date, fetchedAt: new Date().toISOString(), data: results }, { spaces: 2 });

  logger.info(`Spotify charts fetch complete. Success: ${success} | Failed: ${failed}`);
  logger.info(`Data saved to ${SPOTIFY_CHARTS_PATH}`);

  return { date, success, failed, countries: Object.keys(results) };
}

export function readStoredCharts() {
  if (!fs.existsSync(SPOTIFY_CHARTS_PATH)) return null;
  return fs.readJSONSync(SPOTIFY_CHARTS_PATH);
}

export function spotifyChartsJob() {
  schedule.scheduleJob("0 12 * * *", async () => {
    logger.info("Spotify charts scheduled job triggered (12:00 PM)");
    try {
      await fetchAndStoreSpotifyCharts();
    } catch (error) {
      logger.error(`Spotify charts scheduled job failed: ${error.message}`);
    }
  });
  logger.info("Spotify charts job scheduled — runs daily at 12:00 PM");
}
