export default async function handler(req, res) {
  // Set CORS headers
  // You can set "*" to allow any origin, or restrict to your specific domain:
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Ensure you're only handling GET requests (or adjust as needed)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Retrieve environment variables (make sure these are set in Vercel)
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;

  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: 'Missing ClickUp configuration.' });
  }

  try {
    // Fetch data from ClickUp
    const clickupResponse = await fetch(
      `https://api.clickup.com/api/v2/team/${TEAM_ID}/task`,
      {
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
        },
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
