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
  const sample = tasks.slice(0, 5).map(task => ({
    id: task.id,
    name: task.name,
    custom_fields: task.custom_fields,
  }));

  return res.status(200).json({ tasks: sample });
}
