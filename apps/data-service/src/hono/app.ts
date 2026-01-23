import { Hono } from 'hono';

// Destinations 类型定义：包含 default 和可选的国家代码映射
type Destinations = {
	default: string;
	[countryCode: string]: string;
};

// 缓存 TTL（秒）
const CACHE_TTL_SECONDS = 3600; // 1 小时

// 创建 Hono 应用实例，绑定 Cloudflare Workers 的 Env 类型
export const app = new Hono<{ Bindings: Env }>();

// 定义动态路由 /:id
app.get('/:id', async (c) => {
	try {
		const linkId = c.req.param('id');

		// 任务 1.1: 提取 Cloudflare 特定元数据 (CF Metadata)
		const cf = c.req.raw.cf;

		// 任务 1.2: 从 cf 对象中提取地理位置信息
		const country = (cf?.country as string) || 'Unknown';
		const latitude = cf?.latitude as string | undefined;
		const longitude = cf?.longitude as string | undefined;

		// 任务 4.2 Step A: 优先检查 KV 缓存
		const cacheKey = `link:${linkId}`;
		let destinations: Destinations | null = null;

		try {
			const cached = await c.env.LINK_CACHE.get(cacheKey);
			if (cached) {
				destinations = JSON.parse(cached) as Destinations;
			}
		} catch {
			// 缓存读取失败，继续查询数据库
		}

		// 任务 4.2 Step C: 缓存未命中，回源数据库查询
		if (!destinations) {
			// 任务 3.2: 数据库查询逻辑
			const result = await c.env.DB.prepare(
				'SELECT destinations FROM links WHERE link_id = ?'
			)
				.bind(linkId)
				.first<{ destinations: string }>();

			if (!result) {
				return c.json(
					{
						error: 'Link not found',
						linkId,
						country,
						lat: latitude,
						long: longitude,
					},
					404
				);
			}

			destinations = JSON.parse(result.destinations) as Destinations;

			// 任务 4.3: 回写缓存，设置 TTL
			try {
				await c.env.LINK_CACHE.put(cacheKey, JSON.stringify(destinations), {
					expirationTtl: CACHE_TTL_SECONDS,
				});
			} catch {
				// 缓存写入失败，不影响主流程
			}
		}

		// 任务 3.3: 条件路由逻辑 - 根据国家选择目标 URL
		const targetUrl = destinations[country] || destinations.default;

		// 任务 4.2 Step B: 执行重定向
		return c.redirect(targetUrl, 302);
	} catch (error) {
		console.error('Link redirect error:', error);
		return c.json({ error: 'Service unavailable' }, 500);
	}
});
