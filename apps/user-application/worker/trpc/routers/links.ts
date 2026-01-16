import { t } from "@/worker/trpc/trpc-instance";
import { z } from "zod";
import {
  createLinkSchema,
  destinationsSchema,
} from "@repo/data-ops/zod-schema/links";

import { TRPCError } from "@trpc/server";
import {
  ACTIVE_LINKS_LAST_HOUR,
  LAST_30_DAYS_BY_COUNTRY,
} from "./dummy-data";
import { getDb } from "@repo/data-ops/database";
import { links } from "@repo/data-ops/drizzle-schema";
import { eq } from "drizzle-orm";

export const linksTrpcRoutes = t.router({
  linkList: t.procedure
    .input(
      z.object({
        offset: z.number().optional(),
      }),
    )
    .query(async ({}) => {
      const db = getDb();
      const result = await db.select().from(links);
      return result.map((link) => ({
        ...link,
        destinations: JSON.parse(link.destinations),
      }));
    }),
  createLink: t.procedure.input(createLinkSchema).mutation(async ({}) => {
    return "random-id";
  }),
  updateLinkName: t.procedure
    .input(
      z.object({
        linkId: z.string(),
        name: z.string().min(1).max(300),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(links)
        .set({ name: input.name, updated: new Date().toISOString() })
        .where(eq(links.linkId, input.linkId));
    }),
  getLink: t.procedure
    .input(
      z.object({
        linkId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(links)
        .where(eq(links.linkId, input.linkId))
        .limit(1);

      if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });

      const link = result[0];
      return {
        ...link,
        destinations: JSON.parse(link.destinations),
      };
    }),
  updateLinkDestinations: t.procedure
    .input(
      z.object({
        linkId: z.string(),
        destinations: destinationsSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(links)
        .set({
          destinations: JSON.stringify(input.destinations),
          updated: new Date().toISOString(),
        })
        .where(eq(links.linkId, input.linkId));

      return { success: true };
    }),
  activeLinks: t.procedure.query(async () => {
    return ACTIVE_LINKS_LAST_HOUR;
  }),
  totalLinkClickLastHour: t.procedure.query(async () => {
    return 13;
  }),
  last24HourClicks: t.procedure.query(async () => {
    return {
      last24Hours: 56,
      previous24Hours: 532,
      percentChange: 12,
    };
  }),
  last30DaysClicks: t.procedure.query(async () => {
    return 78;
  }),
  clicksByCountry: t.procedure.query(async () => {
    return LAST_30_DAYS_BY_COUNTRY;
  }),
});
