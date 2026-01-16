import { sqliteTable, text, real, numeric, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const linkClicks = sqliteTable("link_clicks", {
	id: text("id").notNull(),
	accountId: text("account_id").notNull(),
	country: text("country"),
	destination: text("destination").notNull(),
	clickedTime: numeric("clicked_time").notNull(),
	latitude: real("latitude"),
	longitude: real("longitude"),
}, (table) => [
	index("idx_link_clicks_id").on(table.id),
]);

export const links = sqliteTable("links", {
	linkId: text("link_id").primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	destinations: text("destinations").notNull(),
	created: numeric("created").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updated: numeric("updated").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	name: text("name").notNull(),
});

export const destinationEvaluations = sqliteTable("destination_evaluations", {
	id: text("id").primaryKey(),
	linkId: text("link_id").notNull(),
	accountId: text("account_id").notNull(),
	destinationUrl: text("destination_url").notNull(),
	status: text("status").notNull(),
	reason: text("reason").notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
	index("idx_destination_evaluations_account_time").on(table.accountId, table.createdAt),
]);
