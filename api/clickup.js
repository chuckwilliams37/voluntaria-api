// api/clickup.js

const rawData = require('../data/tasks.json');

export default async function handler(req, res) {
  // Set CORS headers

  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Disable caching
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const tasks = rawData.tasks || [];
  
  // For debugging: return only a sample of tasks with their custom fields

  const filteredTasks = tasks.filter(task => {
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      // Look for the "Work Party?" field, trimming to be safe
      const wpField = task.custom_fields.find(field => field.name.trim() === "Work Party?");
      if (wpField) {
        let fieldValue = wpField.value_text; // Try the human-readable value first
        
        // If not available, check if value is set as a number (i.e. an index into the options array)
        if (!fieldValue && typeof wpField.value === 'number') {
          const index = wpField.value;
          if (wpField.type_config && Array.isArray(wpField.type_config.options) && index >= 0 && index < wpField.type_config.options.length) {
            fieldValue = wpField.type_config.options[index].name;
          }
        }
        
        // If fieldValue is now set, normalize it and check if it matches our criteria
        if (fieldValue) {
          const normalized = fieldValue.trim().toLowerCase();
          return normalized === "feb 2025" || normalized === "before next";
        }
      }
    }
    return false;
  });
  

  return res.status(200).json({ tasks: filteredTasks });
}
