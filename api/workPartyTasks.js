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

  // Define the target list ID (replace this with your actual list id)
  const TARGET_LIST_ID = "901703816668";  // e.g., "901702177418"

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

    // Filter tasks that either have the desired "Work Party?" values OR are in the target list.
    const filteredTasks = tasks.filter(task => {
      let workPartyMatch = false;

      // Check for the "Work Party?" custom field.
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        const wpField = task.custom_fields.find(field => field.name.trim() === "Work Party?");
        if (wpField) {
          let fieldValue = wpField.value_text;  // Try human‑readable value first.
          // If not available, check if a numeric value is set and use it as an index.
          if (!fieldValue && typeof wpField.value === "number") {
            const idx = wpField.value;
            if (wpField.type_config && Array.isArray(wpField.type_config.options) && idx >= 0 && idx < wpField.type_config.options.length) {
              fieldValue = wpField.type_config.options[idx].name;
            }
          }
          if (fieldValue) {
            const normalized = fieldValue.trim().toLowerCase();
            workPartyMatch = normalized === "feb 2025" || normalized === "before next";
          }
        }
      }

      // Check if the task is in the target list.
      const inTargetList = task.list && task.list.id === TARGET_LIST_ID;

      // Include the task if either condition is true.
      return workPartyMatch || inTargetList;
    });

    // Return the filtered tasks.
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
