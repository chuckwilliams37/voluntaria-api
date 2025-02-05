export default async function handler(req, res) {
  // Set CORS headers for your Weebly site
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get configuration from environment variables
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;
  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: 'Missing ClickUp configuration.' });
  }

  try {
    // Fetch tasks from ClickUp API v2 listing endpoint
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
    const tasks = data.tasks || [];

    // Apply filtering using the derived logic from the schema
    const filteredTasks = tasks.filter(task => {
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        const workPartyField = task.custom_fields.find(field => field.name === "Work Party?");
        if (workPartyField) {
          let fieldValue = workPartyField.value_text;
          if (!fieldValue && workPartyField.value) {
            const selectedOptionId = workPartyField.value;
            if (workPartyField.type_config && Array.isArray(workPartyField.type_config.options)) {
              const selectedOption = workPartyField.type_config.options.find(opt => opt.id === selectedOptionId);
              if (selectedOption) {
                fieldValue = selectedOption.name;
              }
            }
          }
          if (fieldValue) {
            const normalized = fieldValue.trim().toLowerCase();
            return normalized === "feb 2025" || normalized === "before next";
          }
        }
      }
      return false;
    });

    // Return only the filtered tasks
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: 'Error fetching data from ClickUp.' });
  }
}
