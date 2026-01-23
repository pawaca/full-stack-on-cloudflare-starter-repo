import { WorkerEntrypoint } from 'cloudflare:workers';
import { app } from './hono/app';

export default class DataService extends WorkerEntrypoint<Env> {
	fetch(request: Request) {
		// 将请求透传给 Hono 应用，传入 env 和 ctx（ExecutionContext）
		return app.fetch(request, this.env, this.ctx);
	}
}
