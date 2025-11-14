import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const dbName = process.env.COSMOS_DB || "studytracker";
const sessionsContainerName = process.env.COSMOS_CONTAINER || "sessions";
const summariesContainerName = process.env.COSMOS_SUMMARY_CONTAINER || "summaries";

const client = new CosmosClient({ endpoint, key });

export async function getContainers() {
  const db = client.database(dbName);
  const sessions = db.container(sessionsContainerName);
  const summaries = db.container(summariesContainerName);
  return { sessions, summaries };
}

export function weekKey(date = new Date()) {
  
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}


