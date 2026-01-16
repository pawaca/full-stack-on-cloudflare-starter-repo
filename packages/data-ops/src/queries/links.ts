import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/database";
import { links } from "../drizzle-out/schema";
import type { DestinationsSchemaType } from "../zod/links";

export async function createLink(params: {
  accountId: string;
  name: string;
  destinations: DestinationsSchemaType;
}) {
  const db = getDb();
  const linkId = nanoid(10);

  await db.insert(links).values({
    linkId,
    accountId: params.accountId,
    name: params.name,
    destinations: JSON.stringify(params.destinations),
  });

  return linkId;
}

export async function getLinks(params: { accountId: string; limit?: number }) {
  const db = getDb();
  const limit = params.limit ?? 25;

  const result = await db
    .select({
      linkId: links.linkId,
      name: links.name,
      destinations: links.destinations,
      created: links.created,
      updated: links.updated,
    })
    .from(links)
    .where(eq(links.accountId, params.accountId))
    .orderBy(desc(links.created))
    .limit(limit);

  return result.map((row) => ({
    ...row,
    destinations: JSON.parse(row.destinations) as DestinationsSchemaType,
  }));
}

export async function getLink(params: { linkId: string; accountId: string }) {
  const db = getDb();

  const result = await db
    .select()
    .from(links)
    .where(eq(links.linkId, params.linkId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return {
    ...row,
    destinations: JSON.parse(row.destinations) as DestinationsSchemaType,
  };
}

export async function updateLinkDestinations(params: {
  linkId: string;
  accountId: string;
  destinations: DestinationsSchemaType;
}) {
  const db = getDb();

  await db
    .update(links)
    .set({
      destinations: JSON.stringify(params.destinations),
    })
    .where(eq(links.linkId, params.linkId));
}

export async function updateLinkName(params: {
  linkId: string;
  accountId: string;
  name: string;
}) {
  const db = getDb();

  await db
    .update(links)
    .set({
      name: params.name,
    })
    .where(eq(links.linkId, params.linkId));
}

export async function deleteLink(params: { linkId: string; accountId: string }) {
  const db = getDb();

  await db.delete(links).where(eq(links.linkId, params.linkId));
}
