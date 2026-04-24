import { getWebToken, getPlaylistData } from "../utils/fetchSpotify.js";
import { logger } from "../config/winstonConfig.js";
import { countryPlaylist } from "../data/top50SpotifyPlaylist.js";
import { fetchSpotifyData } from "../utils/spotify/fetchSpotify.js";

export async function getPlaylist(req, res, next) {
  try {
    const { country } = req.params;

    if (!countryPlaylist[country]) {
      logger.warn(`Invalid country parameter: ${country}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid country parameter" });
    }

    const accessToken = await getWebToken();
    const result = await getPlaylistData(country, accessToken);
    const resultTop10 = result.tracks.items.slice(0, 10);

    res.json({ success: true, data: resultTop10 });
  } catch (error) {
    logger.error(`Error in getPlaylist: ${error.message}`);
    next(error);
  }
}

export async function getTop50Songs(req, res, next) {
  try {
    const { country_iso2 } = req.params;
    if (!country_iso2 || country_iso2.length !== 2) {
      logger.warn(`Invalid country_iso2 parameter: ${country_iso2}`);
      return res.message(400).json({
        success: false,
        message:
          "Invalid country_iso2 parameter. Provide a valid ISO Alpha-2 code.",
      });
    }
    const result = await fetchSpotifyData(country_iso2);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error in getTop10Songs: ${error.message}`);
    console.log(error);
  }
}
