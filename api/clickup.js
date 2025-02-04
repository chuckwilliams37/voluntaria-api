export default async function handler(req, res) {
  // Set CORS headers to allow your Weebly site
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Retrieve your ClickUp API credentials from environment variables
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;
  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: 'Missing ClickUp configuration.' });
  }

  // Build the search payload
  const searchPayload = {
    team_id: TEAM_ID,  // Provide the team ID in the payload
    query: "",
    custom_fields: [
      {
        id: "1e7f188e-a855-4fb2-82b5-88802b4c3962",  // Replace with your actual custom field ID
        operator: "in",
        value: ["Feb 2025", "BEFORE NEXT"]
      }
    ]
  };

  try {
    // Use the correct search endpoint
    const clickupResponse = await fetch(
      `https://api.clickup.com/api/v2/task/search`,
      {
        method: "POST",
        headers: {
          "Authorization": CLICKUP_API_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(searchPayload)
      }
    );

    if (!clickupResponse.ok) {
      const errorData = await clickupResponse.text();
      return res.status(clickupResponse.status).json({ error: errorData });
    }

    const data = await clickupResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching from ClickUp:', error);
    return res.status(500).json({ error: 'Error fetching data from ClickUp.' });
  }
}
