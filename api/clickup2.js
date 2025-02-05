// api/clickup.js

const rawData = require('../data/tasks.json');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const tasks = rawData.tasks || [];
  
  // For debugging: return only a sample of tasks with their custom fields

  const filteredTasks = tasks.filter(task => {
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      // Look for the "Work Party?" field (trimming to remove accidental whitespace)
      const wpField = task.custom_fields.find(field => field.name.trim() === "Work Party?");
      if (wpField) {
        // Try to use value_text first
        let fieldValue = wpField.value_text;
        
        // If value_text is not available, check if there is a value (likely an option ID)
        if (!fieldValue && wpField.value) {
          const selectedOptionId = wpField.value;
          if (wpField.type_config && Array.isArray(wpField.type_config.options)) {
            const selectedOption = wpField.type_config.options.find(opt => opt.id === selectedOptionId);
            if (selectedOption) {
              fieldValue = selectedOption.name;
            }
          }
        }
        
        // If we got a value, normalize it and compare
        if (fieldValue) {
          const normalized = fieldValue.trim().toLowerCase();
          return normalized === "feb 2025" || normalized === "before next";
        }
      }
    }
    return false;
  });

//   // Return only the filtered tasks
//   const sample = tasks.slice(0, 5).map(task => ({
//     id: task.id,
//     name: task.name,
//     custom_fields: task.custom_fields,
//   }));
    const tasksWithWP = tasks.filter(task => {
        return task.custom_fields && task.custom_fields.some(field => field.name.trim() === "Work Party?");
    });
    return res.status(200).json({ tasks: tasksWithWP });
}
