import { Telegraf } from 'telegraf';

import { about, start } from './commands';
import { greeting, timesheet } from './text';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { useLimit } from './middlewares/limiter';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

bot.start(start())
bot.hashtag(['pia', 'ramen', 'bau'], useLimit(), timesheet())
bot.command('about', useLimit(), about());
bot.on('message', useLimit(1, 10000), greeting());


//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};
//dev mode
ENVIRONMENT !== 'production' && development(bot);
