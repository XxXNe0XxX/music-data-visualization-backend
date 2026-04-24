import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import "dotenv/config";
import fs from "fs";

puppeteer.use(StealthPlugin());

console.log(
  "SP_DC loaded:",
  !!process.env.SP_DC,
  "| length:",
  process.env.SP_DC?.length,
);
console.log(
  "SP_KEY loaded:",
  !!process.env.SP_KEY,
  "| length:",
  process.env.SP_KEY?.length,
);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();

await page.setUserAgent(
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
);

// Use CDP directly — no need to pre-visit the domain
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

console.log("Cookies injected via CDP");

await page.goto(
  "https://charts.spotify.com/charts/view/regional-ua-daily/2026-04-20",
  {
    waitUntil: "networkidle2",
    timeout: 30000,
  },
);

const html = await page.content();
fs.writeFileSync("debug.html", html);

console.log("HTML length:", html.length);
console.log("Has table:", html.includes("<table"));
console.log("Has login:", html.includes("Log in") || html.includes("log in"));
console.log("Title:", await page.title());

await browser.close();
