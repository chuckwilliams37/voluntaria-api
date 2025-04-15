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

    // Process tasks to include those with CatV and add our new categories
    const processedTasks = [];
    
    // First, filter tasks that have a CatV custom field with a value
    tasks.forEach(task => {
      if (!task.custom_fields || !Array.isArray(task.custom_fields)) {
        return;
      }
      
      // Look for CatV field
      const catVField = task.custom_fields.find(field => 
        field.name && field.name.trim() === "CatV"
      );
      
      if (!catVField) {
        return;
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
      
      // Also check if the task is related to "Onsite: Ongoing" or "Onsite: Ideas"
      const isOnsiteOngoing = task.name.includes("Ongoing") || 
                             (fieldValue && fieldValue.includes("Ongoing"));
      
      const isOnsiteIdeas = task.name.includes("Ideas") || 
                           (fieldValue && fieldValue.includes("Ideas"));
      
      // If it has a CatV value or matches our new categories, include it
      if (hasValue || isOnsiteOngoing || isOnsiteIdeas) {
        // If it's one of our special categories but doesn't have a CatV, add one
        if (!hasValue) {
          if (isOnsiteOngoing) {
            // Add a synthetic CatV field for Onsite: Ongoing
            task.custom_fields.push({
              name: "CatV",
              value_text: "Onsite: Ongoing"
            });
            console.log(`Added "Onsite: Ongoing" category to task: ${task.name}`);
          } else if (isOnsiteIdeas) {
            // Add a synthetic CatV field for Onsite: Ideas
            task.custom_fields.push({
              name: "CatV",
              value_text: "Onsite: Ideas"
            });
            console.log(`Added "Onsite: Ideas" category to task: ${task.name}`);
          }
        }
        
        processedTasks.push(task);
        console.log(`Including task: ${task.name} with category: ${
          task.custom_fields.find(f => f.name === "CatV")?.value_text || 
          (typeof catVField?.value === "number" ? 
            catVField?.type_config?.options[catVField.value]?.name : "Unknown")
        }`);
      }
    });
    
    // Create dedicated "Onsite: Ongoing" and "Onsite: Ideas" tasks if none exist
    const hasOnsiteOngoing = processedTasks.some(task => {
      const catVField = task.custom_fields.find(field => field.name === "CatV");
      return catVField && 
             ((catVField.value_text && catVField.value_text.includes("Onsite: Ongoing")) ||
              (typeof catVField.value === "number" && 
               catVField.type_config && 
               catVField.type_config.options && 
               catVField.type_config.options[catVField.value]?.name?.includes("Onsite: Ongoing")));
    });
    
    const hasOnsiteIdeas = processedTasks.some(task => {
      const catVField = task.custom_fields.find(field => field.name === "CatV");
      return catVField && 
             ((catVField.value_text && catVField.value_text.includes("Onsite: Ideas")) ||
              (typeof catVField.value === "number" && 
               catVField.type_config && 
               catVField.type_config.options && 
               catVField.type_config.options[catVField.value]?.name?.includes("Onsite: Ideas")));
    });
    
    // If we don't have any "Onsite: Ongoing" tasks, create a placeholder
    if (!hasOnsiteOngoing) {
      console.log("Creating placeholder for Onsite: Ongoing");
      processedTasks.push({
        id: "onsite-ongoing-placeholder",
        name: "Onsite Ongoing Tasks",
        description: "These are ongoing tasks that can be done onsite",
        custom_fields: [
          {
            name: "CatV",
            value_text: "Onsite: Ongoing"
          },
          {
            name: "OrderV",
            value_text: "1"
          }
        ],
        date_updated: Date.now()
      });
    }
    
    // If we don't have any "Onsite: Ideas" tasks, create a placeholder
    if (!hasOnsiteIdeas) {
      console.log("Creating placeholder for Onsite: Ideas");
      processedTasks.push({
        id: "onsite-ideas-placeholder",
        name: "Onsite Ideas",
        description: "These are ideas for tasks that can be done onsite",
        custom_fields: [
          {
            name: "CatV",
            value_text: "Onsite: Ideas"
          },
          {
            name: "OrderV",
            value_text: "2"
          }
        ],
        date_updated: Date.now()
      });
    }
    
    console.log(`Processed ${processedTasks.length} tasks`);

    // Return the processed tasks
    return res.status(200).json({ tasks: processedTasks });
  } catch (error) {
    console.error("Error fetching from ClickUp:", error);
    return res.status(500).json({ error: "Error fetching data from ClickUp." });
  }
}
