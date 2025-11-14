import { app } from "@azure/functions";
import { v4 as uuid } from "uuid";
import { getContainers } from "../Shared/cosmosClient.js";

app.http('sessions', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'sessions',
  handler: async (req, ctx) => {
    const { sessions } = await getContainers();

    if (req.method === 'POST') {
      const body = await req.json();
      const item = {
        id: uuid(),
        userId: "demo-user", 
        course: body.course,
        topic: body.topic,
        minutes: Number(body.minutes) || 0,
        mood: body.mood || null,
        notes: body.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: "StudySession"
      };
      await sessions.items.create(item);
      return { status: 201, jsonBody: item };
    }

    
    const query = {
      query: "SELECT TOP 20 * FROM c WHERE c.type=@t AND c.userId=@u ORDER BY c.createdAt DESC",
      parameters: [
        { name: "@t", value: "StudySession" },
        { name: "@u", value: "demo-user" }
      ]
    };
    const { resources } = await sessions.items.query(query).fetchAll();
    return { jsonBody: { items: resources } };
  }
});

