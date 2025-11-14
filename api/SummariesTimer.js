import { app } from "@azure/functions";
import { getContainers, weekKey } from "../Shared/cosmosClient.js";

app.timer('summaries-timer', {
  schedule: '0 0 6 * * *', 
  runOnStartup: false,
  handler: async (_timer, _ctx) => {
    const { sessions, summaries } = await getContainers();
    const userId = "demo-user"; 
    const wk = weekKey(new Date());

    
    const start = startOfISOWeek(new Date());
    const end = endOfISOWeek(new Date());

    const query = {
      query:
        "SELECT c.course, c.minutes FROM c WHERE c.type=@t AND c.userId=@u AND c.createdAt >= @from AND c.createdAt <= @to",
      parameters: [
        { name: "@t", value: "StudySession" },
        { name: "@u", value: userId },
        { name: "@from", value: start.toISOString() },
        { name: "@to", value: end.toISOString() }
      ]
    };
    const { resources } = await sessions.items.query(query).fetchAll();
    const totalMinutes = resources.reduce((a,b)=>a + (b.minutes||0), 0);
    const byCourse = {};
    for (const r of resources) {
      byCourse[r.course] = (byCourse[r.course] || 0) + (r.minutes || 0);
    }

    const id = `${userId}:${wk}`;
    const doc = {
      id,
      userId,
      type: "Summary",
      period: wk,
      totalMinutes,
      byCourse,
      updatedAt: new Date().toISOString()
    };
    await summaries.items.upsert(doc);
  }
});


function startOfISOWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; 
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() - day);
  return date;
}
function endOfISOWeek(d) {
  const s = startOfISOWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23,59,59,999);
  return e;
}
