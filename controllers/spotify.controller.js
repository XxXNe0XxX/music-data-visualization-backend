import { logger } from "../config/winstonConfig.js";
import { readStoredCharts, fetchAndStoreSpotifyCharts } from "../utils/spotify/spotifyFetchAndStore.js";

export async function getTop10ByCountry(req, res, next) {
  try {
    const { country } = req.params;

    if (!country || country.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid ISO Alpha-2 country code (e.g. 'at', 'us').",
      });
    }

    const stored = readStoredCharts();

    if (!stored) {
      return res.status(503).json({
        success: false,
        message: "Chart data is not available yet. Try again shortly or call /api/spotify/refresh.",
      });
    }

    const countryKey = country.toLowerCase();
    const data = stored.data?.[countryKey];

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `No chart data found for country '${country.toUpperCase()}'. It may not be supported.`,
      });
    }

    res.json({ success: true, country: countryKey, date: stored.date, fetchedAt: stored.fetchedAt, data });
  } catch (error) {
    logger.error(`Error in getTop10ByCountry: ${error.message}`);
    next(error);
  }
}

export async function refreshSpotifyCharts(req, res, next) {
  try {
    logger.info("Manual Spotify charts refresh triggered via API");
    res.json({ success: true, message: "Spotify charts refresh started. This may take several minutes." });
    await fetchAndStoreSpotifyCharts();
  } catch (error) {
    logger.error(`Error in refreshSpotifyCharts: ${error.message}`);
    next(error);
  }
}
