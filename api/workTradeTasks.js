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
      console.error(`ClickUp API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const tasks = data.tasks || [];
    
    console.log(`Retrieved ${tasks.length} total tasks from ClickUp`);

    // Filter tasks that are in the "V: To Do List (Misc)" list and have "CatV" custom field set to "Work Trade"
    const filteredTasks = tasks.filter(task => {
      // Check for "CatV" = "Work Trade", don't filter by list
      let hasWorkTradeCategory = false;
      
      // Check custom fields for "CatV" = "Work Trade"
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        const catVField = task.custom_fields.find(field => field.name && field.name.trim() === "CatV");
        if (catVField) {
          let fieldValue = catVField.value_text;  // Try human‑readable value first
          
          // If not available, check if a numeric value is set and use it as an index
          if (!fieldValue && typeof catVField.value === "number") {
            const idx = catVField.value;
            if (catVField.type_config && Array.isArray(catVField.type_config.options) && 
                idx >= 0 && idx < catVField.type_config.options.length) {
              fieldValue = catVField.type_config.options[idx].name;
            }
          }
          
          if (fieldValue) {
            hasWorkTradeCategory = fieldValue.trim() === "Work Trade";
          }
        }
      }
      
      // Log each task and its CatV value for debugging
      if (hasWorkTradeCategory) {
        console.log(`Found Work Trade task: ${task.name}`);
      }
      
      return hasWorkTradeCategory;
    });

    console.log(`Filtered to ${filteredTasks.length} Work Trade tasks`);
    
    // Log the first few tasks for verification
    if (filteredTasks.length > 0) {
      console.log('Sample Work Trade tasks:');
      filteredTasks.slice(0, 3).forEach(task => {
        console.log(`- ${task.name} (ID: ${task.id})`);
      });
    }

    // Return the filtered work trade tasks
    return res.status(200).json({ tasks: filteredTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
