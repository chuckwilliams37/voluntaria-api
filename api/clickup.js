export default async function handler(req, res) {
  // Set CORS headers to allow your Weebly site to access the endpoint.
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Prevent caching at client and intermediary layers.
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  // Handle preflight OPTIONS requests.
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests.
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Retrieve ClickUp API configuration from environment variables.
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;
  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: "Missing ClickUp configuration." });
  }

  try {
    // Fetch live tasks from ClickUp API v2 listing endpoint.
    const response = await fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/task`, {
      headers: {
        "Authorization": CLICKUP_API_TOKEN,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    
    // (Optional) You can add filtering or processing logic here if needed.
    
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
