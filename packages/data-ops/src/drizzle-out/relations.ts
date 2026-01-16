import { relations } from "drizzle-orm";
import { linkClicks, links, destinationEvaluations } from "./schema";

export const linksRelations = relations(links, ({ many }) => ({
	linkClicks: many(linkClicks),
	destinationEvaluations: many(destinationEvaluations),
}));

export const linkClicksRelations = relations(linkClicks, ({ one }) => ({
	// Note: link_clicks doesn't have a foreign key to links in the DB schema
	// If you need a relation, add a foreign key reference
}));

export const destinationEvaluationsRelations = relations(destinationEvaluations, ({ one }) => ({
	link: one(links, {
		fields: [destinationEvaluations.linkId],
		references: [links.linkId],
	}),
}));
