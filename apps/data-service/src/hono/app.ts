import { Hono } from 'hono';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { getDestinationForCountry, getLinkInfoFromKV } from '@/helpers/routing-ops';

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

	// 使用 Helper 函数获取链接信息（KV 缓存 + D1 回源）
	const linkInfo = await getLinkInfoFromKV(c.env.LINK_CACHE, c.env.DB, id);

	if (!linkInfo) {
		return c.text('Destination not found', 404);
	}

	// 使用辅助函数获取目标 URL
	const destination = getDestinationForCountry(linkInfo, headers.country);

	return c.redirect(destination);
});
