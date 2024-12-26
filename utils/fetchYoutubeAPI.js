const fetch = require("node-fetch");
const { youtubeApiKey } = require("../config");

/**
 * Llama a la YouTube Data API para obtener los videos más populares en una región
 * utilizando chart=mostPopular.
 * @param {string} regionCode - Código de país (ej. "US", "MX", "ES").
 * @returns {Promise<Object>} - JSON con la información de los videos (snippet, statistics).
 */
async function getMostPopularVideos(regionCode) {
  // Ejemplo de endpoint:
  // GET https://www.googleapis.com/youtube/v3/videos
  //   ?chart=mostPopular
  //   &regionCode=US
  //   &maxResults=10
  //   &part=snippet,statistics
  //   &key=YOUR_API_KEY

  const baseUrl = "https://www.googleapis.com/youtube/v3/videos";
  const url = new URL(baseUrl);
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("key", youtubeApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

module.exports = { getMostPopularVideos };