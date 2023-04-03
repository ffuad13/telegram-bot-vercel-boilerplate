import { Context } from 'telegraf';
import { RateLimiter } from './rate-limiter';
import createDebug from 'debug';

const debug = createDebug('bot:useLimit');

const useLimit = (amount: number = 1, interval: number = 3000) => {
	const rateLimiter = new RateLimiter(amount, interval);

  return async (ctx: Context, next: any) => {
    const limited = await rateLimiter.take(ctx.from?.id);

    if (limited) {
			const time: number = interval / 1000
      const userName = `${ctx.message?.from.first_name} ${ctx.message?.from.last_name}`;

      debug(`Triggered "useLimit" middleware by ${userName}`);
      return await ctx.reply(`Hey! Wait ${time} second before send a new message!`);
    } else {
      return next();
    }
  };
};

export { useLimit };
