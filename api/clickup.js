// api/clickup.js

// Use require to load the JSON file (ensure the path is correct)
const rawData = require('../data/tasks.json');

export default async function handler(req, res) {
  // Set CORS headers to allow your Weebly site
  res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Use the static data from the JSON file
  const tasks = rawData.tasks || [];

  // Apply filtering based on the "Work Party?" custom field.
  // Update the filtering logic as needed after inspecting your file.
  const filteredTasks = tasks.filter(task => {
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      const workPartyField = task.custom_fields.find(field => field.name === "Work Party?");
      if (workPartyField) {
        // Try to get a human-readable value from either value_text or by mapping the option ID.
        let fieldValue = workPartyField.value_text;
        if (!fieldValue && workPartyField.value) {
          const selectedOptionId = workPartyField.value;
          if (workPartyField.type_config && Array.isArray(workPartyField.type_config.options)) {
            const selectedOption = workPartyField.type_config.options.find(opt => opt.id === selectedOptionId);
            if (selectedOption) {
              fieldValue = selectedOption.name;
            }
          }
        }
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
