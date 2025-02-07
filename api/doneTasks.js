export default async function handler(req, res) {
    // Set CORS headers for your Weebly site.
    res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  
    // Handle preflight OPTIONS requests.
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    
    // Retrieve ClickUp API configuration.
    const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
    const TEAM_ID = process.env.CLICKUP_TEAM_ID; // Ensure this is the correct Voluntaria space ID.
    if (!CLICKUP_API_TOKEN || !TEAM_ID) {
      return res.status(500).json({ error: "Missing ClickUp configuration." });
    }
    
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
    
      // Filter tasks that are considered "done".
      const doneTasks = tasks.filter(task => {
        // Check if date_done is set.
        const hasDateDone = task.date_done && task.date_done !== "" && task.date_done !== "null";
        
        // Normalize the task status.
        const statusStr = task.status && task.status.status ? task.status.status.trim().toLowerCase() : "";
        const statusDone = statusStr === "done" || statusStr === "closed" || statusStr === "completed";
    
        return hasDateDone || statusDone;
      });
    
      return res.status(200).json({ tasks: doneTasks });
    } catch (error) {
      console.error("Error fetching done tasks:", error);
      return res.status(500).json({ error: "Error fetching data from ClickUp." });
    }
  }
  