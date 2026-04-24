// routes/imageProxy.js
export async function proxyImage(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send("Missing URL parameter");
  }

  // Decode the URL first, then validate
  const decodedUrl = decodeURIComponent(url);

  // Only allow Netflix image URLs for security
  if (!decodedUrl.startsWith("https://dnm.nflximg.net")) {
    return res.status(400).send("Invalid URL - only Netflix images allowed");
  }

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        Referer: "https://www.netflix.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }

    // Forward the content-type and cache headers
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.set("Content-Type", contentType);
    }
    res.set("Cache-Control", "public, max-age=86400"); // cache 24h on your CDN/client

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
}
