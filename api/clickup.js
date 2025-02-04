export default async function handler(req, res) {
  // Set CORS headers to allow requests from your Weebly site
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Retrieve configuration from environment variables
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;
  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: 'Missing ClickUp configuration.' });
  }

  try {
    // Fetch tasks from the ClickUp API v2 listing endpoint
    const response = await fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/task`, {
      headers: {
        'Authorization': CLICKUP_API_TOKEN,
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    // Assuming tasks are in data.tasks; adjust if needed
    const tasks = data.tasks || [];

    // Filter tasks based on the "Work Party?" custom field
    const filteredTasks = tasks.filter(task => {
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        // Find the custom field named "Work Party?"
        const workPartyField = task.custom_fields.find(field => field.name === "Work Party?");
        if (workPartyField) {
          // Check the value (it might be stored in `value` or `value_text`)
          const fieldValue = workPartyField.value || workPartyField.value_text;
          return fieldValue === "Feb 2025" || fieldValue === "BEFORE NEXT";
        }
      }
      return false;
    });

    // Return the filtered tasks
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: 'Error fetching data from ClickUp.' });
  }
}
