// api/clickup.js

export default async function handler(req, res) {
    // Only allow GET requests (adjust if you need more methods)
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }
  
    // Retrieve environment variables (ensure these are set in Vercel)
    const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
    const TEAM_ID = process.env.CLICKUP_TEAM_ID; // Or hard-code your team ID if desired
  
    if (!CLICKUP_API_TOKEN || !TEAM_ID) {
      res.status(500).json({ error: 'Missing ClickUp configuration.' });
      return;
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
        // Handle non-2xx responses
        const errorData = await clickupResponse.text();
        res.status(clickupResponse.status).json({ error: errorData });
        return;
      }
  
      const data = await clickupResponse.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching from ClickUp:', error);
      res.status(500).json({ error: 'Error fetching data from ClickUp.' });
    }
  }
  