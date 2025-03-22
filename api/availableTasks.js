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
      console.error(`ClickUp API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const tasks = data.tasks || [];
    
    console.log(`Retrieved ${tasks.length} total tasks from ClickUp`);

    // Filter tasks that have a CatV custom field with a value
    const filteredTasks = tasks.filter(task => {
      if (!task.custom_fields || !Array.isArray(task.custom_fields)) {
        return false;
      }
      
      // Look for CatV field
      const catVField = task.custom_fields.find(field => 
        field.name && field.name.trim() === "CatV"
      );
      
      if (!catVField) {
        return false;
      }
      
      // Check if the field has a value
      let hasValue = false;
      let fieldValue = null;
      
      if (catVField.value_text) {
        hasValue = true;
        fieldValue = catVField.value_text.trim();
      } else if (typeof catVField.value === "number") {
        const idx = catVField.value;
        if (catVField.type_config && Array.isArray(catVField.type_config.options) && 
            idx >= 0 && idx < catVField.type_config.options.length) {
          hasValue = true;
          fieldValue = catVField.type_config.options[idx].name.trim();
        }
      }
      
      if (hasValue) {
        console.log(`Found task with CatV=${fieldValue}: ${task.name}`);
      }
      
      return hasValue;
    });
    
    console.log(`Filtered to ${filteredTasks.length} tasks with CatV assigned`);

    // Return the filtered tasks.
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
