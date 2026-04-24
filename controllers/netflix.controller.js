// controllers/netflixController.js

/* OLD CODE ───────────────────────────────────────────────────────────────────
// import fs from "fs/promises";
// import path from "path";
// import processNetflixTop10 from "../utils/netflix/netflixProcessor.js";
// import { fetchImage } from "../utils/netflix/fetchImage.js";
// const MOVIES_FILE_PATH = path.join(
//   "processed",
//   "latest-netflix-top-movies.json"
// );
// */
// export async function getPopularMovies(req, res) {
//   const { country_iso2 } = req.params;

//   // 1. Validate country_iso2
//   if (!country_iso2 || country_iso2.length !== 2) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Invalid or missing country_iso2 parameter. Provide a valid ISO Alpha-2 code.",
//     });
//   }

//   try {
//     // 2. Check if the processed movies file exists
//     try {
//       await fs.access(MOVIES_FILE_PATH);
//       console.log("Movies file found. Reading data...");
//     } catch {
//       console.log("Movies file not found. Generating data...");
//       await processNetflixTop10(); // This should create latest-netflix-top-movies.json
//     }

//     // 3. Read the movies file
//     const data = await fs.readFile(MOVIES_FILE_PATH, "utf-8");
//     const jsonData = JSON.parse(data);

//     // 4. Extract data for the requested country
//     const countryKey = country_iso2.toUpperCase();
//     const countryData = jsonData.country_list[countryKey];

//     if (!countryData) {
//       return res.status(404).json({
//         success: false,
//         message: `No data found for country with ISO code '${country_iso2}'.`,
//       });
//     }

//     // countryData looks like: { country_name: "...", films: [ { name, rank, ... }, ... ] }

//     // 5. Fetch images for each film on demand
//     for (const film of countryData.films) {
//       // 'rank' is the field we used in the new structure (vs. 'posicion')
//       film.image = await fetchImage("FILMS", country_iso2, film.rank);
//     }

//     // 6. Respond with the country's data (which now includes the images)
//     return res.status(200).json({
//       success: true,
//       message: `Netflix Top Movies retrieved successfully for '${country_iso2}'.`,
//       data: {
//         country_name: countryData.country_name,
//         films: countryData.films,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getPopularMovies:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to retrieve Netflix Top 10 movies.",
//       error: error.message,
//     });
//   }
// }

// // controllers/netflixController.js
// const SHOWS_FILE_PATH = path.join("processed", "latest-netflix-top-shows.json");

// export async function getPopularShows(req, res) {
//   const { country_iso2 } = req.params;
//   if (!country_iso2 || country_iso2.length !== 2) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Invalid or missing country_iso2 parameter. Provide a valid ISO Alpha-2 code.",
//     });
//   }

//   try {
//     // Check file existence
//     try {
//       await fs.access(SHOWS_FILE_PATH);
//       console.log("Shows file found. Reading data...");
//     } catch {
//       console.log("Shows file not found. Generating data...");
//       await processNetflixTop10(); // Creates latest-netflix-top-shows.json
//     }

//     // Read the shows file
//     const data = await fs.readFile(SHOWS_FILE_PATH, "utf-8");
//     const jsonData = JSON.parse(data);

//     // Extract data for the requested country
//     const countryKey = country_iso2.toUpperCase();
//     const countryData = jsonData.country_list[countryKey];
//     if (!countryData) {
//       return res.status(404).json({
//         success: false,
//         message: `No data found for country with ISO code '${country_iso2}'.`,
//       });
//     }

//     // Each show entry is in countryData.tv
//     for (const show of countryData.tv) {
//       show.image = await fetchImage("TV", country_iso2, show.rank);
//     }

//     // Return the shows
//     return res.status(200).json({
//       success: true,
//       message: `Netflix Top Shows retrieved successfully for '${country_iso2}'.`,
//       data: {
//         country_name: countryData.country_name,
//         tv: countryData.tv,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getPopularShows:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to retrieve Netflix Top 10 shows.",
//       error: error.message,
//     });
//   }
// }
/* NEW CODE */
import { fetchNetflixTop10 } from "../utils/netflix/tudumScrape.js";
export async function getPopularMovies(req, res) {
  const { country_iso2 } = req.params;

  // 1. Validate country_iso2
  if (!country_iso2 || country_iso2.length !== 2) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing country_iso2 parameter. Provide a valid ISO Alpha-2 code.",
    });
  }

  try {
    // Fetch fresh data directly from Netflix Tudum
    const movies = await fetchNetflixTop10(country_iso2, "movies");

    // Transform data to match expected format
    const films = movies.map((movie) => ({
      name: movie.title,
      rank: movie.position,
      weeksOnChart: movie.weeksOnChart,
      image: movie.imageUrl,
      titleImage: movie.titleImageUrl,
      watchUrl: movie.watchUrl,
      seasonLabel: movie.seasonLabel,
    }));

    return res.status(200).json({
      success: true,
      message: `Netflix Top Movies retrieved successfully for '${country_iso2}'.`,
      data: {
        country_name: `${country_iso2.toUpperCase()}`, // Could be enhanced with actual country name
        films: films,
      },
    });
  } catch (error) {
    console.error("Error in getPopularMovies:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Netflix Top 10 movies.",
      error: error.message,
    });
  }
}

export async function getPopularShows(req, res) {
  const { country_iso2 } = req.params;
  if (!country_iso2 || country_iso2.length !== 2) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing country_iso2 parameter. Provide a valid ISO Alpha-2 code.",
    });
  }

  try {
    // Fetch fresh data directly from Netflix Tudum
    const shows = await fetchNetflixTop10(country_iso2, "shows");

    // Transform data to match expected format
    const tv = shows.map((show) => ({
      name: show.title,
      rank: show.position,
      weeksOnChart: show.weeksOnChart,
      image: show.imageUrl,
      titleImage: show.titleImageUrl,
      watchUrl: show.watchUrl,
      seasonLabel: show.seasonLabel,
    }));

    return res.status(200).json({
      success: true,
      message: `Netflix Top Shows retrieved successfully for '${country_iso2}'.`,
      data: {
        country_name: `${country_iso2.toUpperCase()}`, // Could be enhanced with actual country name
        tv: tv,
      },
    });
  } catch (error) {
    console.error("Error in getPopularShows:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve Netflix Top 10 shows.",
      error: error.message,
    });
  }
}
