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

  // Define the target list ID for "V: To Do List (Misc)"
  const TO_DO_LIST_ID = "901703816668";  // Update this with the actual list ID for "V: To Do List (Misc)"

  try {
    // Fetch tasks from the ClickUp API v2 listing endpoint.
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

    // Filter tasks that are in the "V: To Do List (Misc)" list and have "work trade" tag or custom field
    const filteredTasks = tasks.filter(task => {
      // Check if the task is in the target list
      const inToDoList = task.list && task.list.id === TO_DO_LIST_ID;
      
      if (!inToDoList) {
        return false; // Skip tasks not in the target list
      }
      
      let isWorkTrade = false;
      
      // Check for "work trade" in custom fields
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        // Look for any custom field that might indicate work trade
        for (const field of task.custom_fields) {
          if (field.value_text) {
            const value = field.value_text.trim().toLowerCase();
            if (value === "work trade" || value.includes("work trade")) {
              isWorkTrade = true;
              break;
            }
          }
        }
      }
      
      // Check for "work trade" in tags
      if (!isWorkTrade && task.tags && Array.isArray(task.tags)) {
        isWorkTrade = task.tags.some(tag => 
          tag.name.trim().toLowerCase() === "work trade" || 
          tag.name.trim().toLowerCase().includes("work trade")
        );
      }
      
      // Check for "work trade" in the task name
      if (!isWorkTrade && task.name) {
        isWorkTrade = task.name.toLowerCase().includes("work trade");
      }
      
      return isWorkTrade;
    });

    // Return the filtered work trade tasks
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
