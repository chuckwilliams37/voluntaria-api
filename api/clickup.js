export default async function handler(req, res) {
  // Set CORS headers to allow your Weebly site to access the endpoint.
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Prevent caching.
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
    // Fetch live tasks from the ClickUp API v2 listing endpoint.
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
    const tasks = data.tasks || [];

    // Filter tasks based on the "Work Party?" field.
    // We assume that "Work Party?" is a drop-down field where the selected value is stored as a number.
    // That number is used as an index into the field's type_config.options array.
    const filteredTasks = tasks.filter(task => {
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        // Look for the custom field named "Work Party?"
        const wpField = task.custom_fields.find(field => field.name.trim() === "Work Party?");
        if (wpField) {
          let fieldValue = wpField.value_text;  // Try using a human-readable value first.
          // If no value_text, check if a numeric value is set.
          if (!fieldValue && typeof wpField.value === "number") {
            const idx = wpField.value;
            if (wpField.type_config && Array.isArray(wpField.type_config.options) && idx >= 0 && idx < wpField.type_config.options.length) {
              fieldValue = wpField.type_config.options[idx].name;
            }
          }
          if (fieldValue) {
            // Normalize the field value to lowercase for comparison.
            const normalized = fieldValue.trim().toLowerCase();
            return normalized === "feb 2025" || normalized === "before next";
          }
        }
      }
      return false;
    });

    // Return the filtered tasks.
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
