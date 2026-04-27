import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/morganWinstonHandler.js";
import dotenv from "dotenv";
import { netflixJob } from "./utils/netflix/fetchTopWeekly10.js";
import { spotifyChartsJob } from "./utils/spotify/spotifyFetchAndStore.js";

dotenv.config();
const app = express();

// Middlewares globales
app.use(cors());
app.use(requestLogger); // Registrar todas las solicitudes HTTP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas - montamos bajo /api
app.use("/api", routes);

// Manejo de errores global
app.use(errorHandler);

netflixJob();
spotifyChartsJob();

app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
});
