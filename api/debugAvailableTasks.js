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
          if (field.name) {
            customFieldNames.add(field.name.trim());
            // Log each field with its untrimmed and trimmed name for diagnosis
            console.log(`Field Name: "${field.name}" | Trimmed: "${field.name.trim()}"`);
          }
        });
      }
    });

    // Collect tasks that have fields similar to "Area"
    const possibleAreaFields = Array.from(customFieldNames)
      .filter(name => name.toLowerCase().includes('area'))
      .sort();
    
    // Count tasks for each possible area field
    const areaCounts = {};
    possibleAreaFields.forEach(fieldName => {
      areaCounts[fieldName] = 0;
    });
    
    tasks.forEach(task => {
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        task.custom_fields.forEach(field => {
          if (field.name && possibleAreaFields.includes(field.name.trim())) {
            areaCounts[field.name.trim()]++;
          }
        });
      }
    });
    
    // Count tasks with exactly "Area" field
    const exactAreaTaskCount = tasks.filter(task => {
      return task.custom_fields && Array.isArray(task.custom_fields) &&
             task.custom_fields.some(field => field.name && field.name.trim() === "Area");
    }).length;
    
    // Get sample tasks with "Area" fields
    const areaSampleTasks = tasks
      .filter(task => {
        return task.custom_fields && Array.isArray(task.custom_fields) &&
               task.custom_fields.some(field => field.name && 
                 possibleAreaFields.includes(field.name.trim()));
      })
      .slice(0, 5)
      .map(task => {
        const fieldNames = task.custom_fields
          .filter(field => field.name && possibleAreaFields.includes(field.name.trim()))
          .map(field => field.name.trim());
        
        return {
          id: task.id,
          name: task.name,
          listId: task.list ? task.list.id : null,
          listName: task.list ? task.list.name : null,
          areaFields: fieldNames
        };
      });

    // Return debug information
    return res.status(200).json({
      totalTasks: tasks.length,
      customFieldNames: Array.from(customFieldNames),
      possibleAreaFields,
      areaCounts,
      exactAreaTaskCount,
      areaSampleTasks
    });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
