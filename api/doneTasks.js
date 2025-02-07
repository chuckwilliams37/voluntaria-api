export default async function handler(req, res) {
    // Set CORS headers for your Weebly site.
    res.setHeader("Access-Control-Allow-Origin", "https://www.voluntaria.community");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Prevent caching.
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  
    // Handle preflight OPTIONS requests.
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    
    // Retrieve ClickUp API configuration from environment variables.
    const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
    const TEAM_ID = process.env.CLICKUP_TEAM_ID; // Ensure this is the Voluntaria space ID.
    if (!CLICKUP_API_TOKEN || !TEAM_ID) {
      return res.status(500).json({ error: "Missing ClickUp configuration." });
    }
    
    try {
      // Append ?archived=true to include completed tasks.

      
      const apiUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&statuses[]=complete&ts=${new Date().getTime()}`;
      const response = await fetch(apiUrl, {
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
      // We'll consider a task "done" if:
      //  - Its date_done is set (non-null, non-empty)
      //  OR its status.status (after trimming and lowercasing) is "done", "closed", or "completed".
    //   const doneTasks = tasks.filter(task => {
    //     const hasDateDone = task.date_done && task.date_done !== "" && task.date_done !== "null";
    //     const statusStr = task.status && task.status.status ? task.status.status.trim().toLowerCase() : "";
    //     const statusDone = statusStr === "done" || statusStr === "closed" || statusStr === "completed";
    //     return hasDateDone || statusDone;
    //   });
    
      return res.status(200).json({ tasks });
    } catch (error) {
      console.error("Error fetching done tasks:", error);
      return res.status(500).json({ error: "Error fetching data from ClickUp." });
    }
  }
  