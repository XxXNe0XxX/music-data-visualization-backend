import schedule from "node-schedule";
import processNetflixTop10 from "./netflixProcessor.js";

export async function netflixJob() {
  schedule.scheduleJob("0 3 * * 2", async () => {
    // await processNetflixTop10();
  });
}
