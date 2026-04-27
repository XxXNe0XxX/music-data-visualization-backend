import { logger } from "../config/winstonConfig.js";
import { fetchSpotifyCharts } from "../utils/spotify/spotifyChartsFetch.js";

export async function getTop10ByCountry(req, res, next) {
  try {
    const { country } = req.params;

    if (!country || country.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid ISO Alpha-2 country code (e.g. 'at', 'us').",
      });
    }

    const chartData = await fetchSpotifyCharts(country);
    const top10 = chartData.entries.slice(0, 10).map((entry) => {
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

    res.json({ success: true, country: country.toLowerCase(), data: top10 });
  } catch (error) {
    logger.error(`Error in getTop10ByCountry: ${error.message}`);
    next(error);
  }
}
