import { app } from "@azure/functions";
import { getContainers, weekKey } from "../Shared/cosmosClient.js";

app.http('summaries-weekly', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'summaries/weekly',
  handler: async (_req, _ctx) => {
    const { summaries } = await getContainers();
    const userId = "demo-user";
    const id = `${userId}:${weekKey()}`;
    try {
      const { resource } = await summaries.item(id, userId).read();
      return { jsonBody: resource };
    } catch {
      return { status: 404, jsonBody: { message: "No Summary just yet" } };
    }
  }

});
