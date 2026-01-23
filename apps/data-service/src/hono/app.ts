import { Hono } from 'hono';

// 创建 Hono 应用实例，绑定 Cloudflare Workers 的 Env 类型
// 这样在路由处理器中可以通过 c.env 访问 Cloudflare bindings
export const app = new Hono<{ Bindings: Env }>();

// 定义动态路由 /:id
app.get('/:id', (c) => {
	const id = c.req.param('id');
	const userAgent = c.req.header('User-Agent') || 'Unknown';

	// 示例：访问 Hono context 成员
	// c.env - 访问 Cloudflare bindings（如 D1, KV, R2 等）
	// c.req - 访问请求对象
	// c.req.url - 获取完整 URL
	// c.req.method - 获取 HTTP 方法
	// c.req.header() - 获取请求头
	const url = c.req.url;
	const method = c.req.method;

	return c.json({
		id,
		userAgent,
		url,
		method,
		message: `You requested ID: ${id}`,
	});
});
