export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Prevent caching
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Retrieve ClickUp API configuration from environment variables
  const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
  const TEAM_ID = process.env.CLICKUP_TEAM_ID;
  if (!CLICKUP_API_TOKEN || !TEAM_ID) {
    return res.status(500).json({ error: "Missing ClickUp configuration." });
  }

  // Define the target list ID for "V: To Do List (Misc)"
  const TO_DO_LIST_ID = "901703816668";  // Update this with the actual list ID

  try {
    // Fetch tasks from the ClickUp API
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
    
    // Get all unique custom field names for investigation
    const customFieldNames = new Set();
    tasks.forEach(task => {
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        task.custom_fields.forEach(field => {
          if (field.name) customFieldNames.add(field.name.trim());
        });
      }
    });

    // Extract tasks with CatV field
    const tasksWithCatV = tasks.filter(task => {
      return task.custom_fields && Array.isArray(task.custom_fields) &&
             task.custom_fields.some(field => field.name && field.name.trim() === "CatV");
    });

    // Extract values of CatV field
    const catVValues = new Set();
    tasksWithCatV.forEach(task => {
      const catVField = task.custom_fields.find(field => field.name.trim() === "CatV");
      if (catVField) {
        let fieldValue = catVField.value_text;
        if (!fieldValue && typeof catVField.value === "number") {
          const idx = catVField.value;
          if (catVField.type_config && Array.isArray(catVField.type_config.options) && 
              idx >= 0 && idx < catVField.type_config.options.length) {
            fieldValue = catVField.type_config.options[idx].name;
          }
        }
        if (fieldValue) catVValues.add(fieldValue.trim());
      }
    });

    // Count tasks with "Work Trade" as CatV value
    const workTradeTasks = tasksWithCatV.filter(task => {
      const catVField = task.custom_fields.find(field => field.name.trim() === "CatV");
      if (catVField) {
        let fieldValue = catVField.value_text;
        if (!fieldValue && typeof catVField.value === "number") {
          const idx = catVField.value;
          if (catVField.type_config && Array.isArray(catVField.type_config.options) && 
              idx >= 0 && idx < catVField.type_config.options.length) {
            fieldValue = catVField.type_config.options[idx].name;
          }
        }
        return fieldValue && fieldValue.trim() === "Work Trade";
      }
      return false;
    });

    // Sample of work trade tasks for inspection
    const workTradeSample = workTradeTasks.slice(0, 5).map(task => ({
      id: task.id,
      name: task.name,
      listId: task.list ? task.list.id : null,
      listName: task.list ? task.list.name : null
    }));

    // Return debug information
    return res.status(200).json({
      totalTasks: tasks.length,
      customFieldNames: Array.from(customFieldNames),
      tasksWithCatVCount: tasksWithCatV.length,
      catVValues: Array.from(catVValues),
      workTradeTasksCount: workTradeTasks.length,
      workTradeSample: workTradeSample
    });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
