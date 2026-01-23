import { Hono } from 'hono';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import type { LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { getDestinationForCountry } from '@/helpers/routing-ops';

// 缓存 TTL（秒）
const CACHE_TTL_SECONDS = 3600; // 1 小时

// 创建 Hono 应用实例，绑定 Cloudflare Workers 的 Env 类型
export const app = new Hono<{ Bindings: Env }>();

// 定义动态路由 /:id
app.get('/:id', async (c) => {
	const id = c.req.param('id');

	// 解析 Cloudflare headers
	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);
	if (!cfHeader.success) {
		return c.text('Invalid Cloudflare headers', 400);
	}
	const headers = cfHeader.data;
	console.log('CF Headers:', headers);

	// KV 缓存优先查询
	const cacheKey = `link:${id}`;
	let linkInfo: LinkSchemaType | null = null;

	try {
		const cached = await c.env.LINK_CACHE.get(cacheKey);
		if (cached) {
			const parsed = JSON.parse(cached);
			// 验证缓存数据格式是否正确（包含 linkId 字段）
			if (parsed && typeof parsed.linkId === 'string') {
				linkInfo = parsed as LinkSchemaType;
			}
		}
	} catch {
		// 缓存读取失败或格式不匹配，继续查询数据库
	}

	// 缓存未命中，回源数据库查询
	if (!linkInfo) {
		const result = await c.env.DB.prepare(
			'SELECT link_id, account_id, name, destinations, created, updated FROM links WHERE link_id = ?'
		)
			.bind(id)
			.first<{
				link_id: string;
				account_id: string;
				name: string;
				destinations: string;
				created: string;
				updated: string;
			}>();

		if (!result) {
			return c.text('Destination not found', 404);
		}

		linkInfo = {
			linkId: result.link_id,
			accountId: result.account_id,
			name: result.name,
			destinations: JSON.parse(result.destinations),
			created: result.created,
			updated: result.updated,
		};

		// 回写缓存，设置 TTL
		try {
			await c.env.LINK_CACHE.put(cacheKey, JSON.stringify(linkInfo), {
				expirationTtl: CACHE_TTL_SECONDS,
			});
		} catch {
			// 缓存写入失败，不影响主流程
		}
	}

	// 使用辅助函数获取目标 URL
	const destination = getDestinationForCountry(linkInfo, headers.country);

	return c.redirect(destination);
});
