import { Telegraf } from 'telegraf';

import { connectToDatabase } from './models/db.config';

import { about, help, start } from './commands';
import { greeting, timesheet, gempa, test } from './text';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { useLimit } from './middlewares/limiter';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

bot.start(start());
bot.help(help());
bot.hears('gempa', gempa())
bot.hears('test', test())
bot.hashtag(['pia', 'ramen', 'bau', 'timesheet'], useLimit(1, 10000), timesheet());
bot.command('about', useLimit(), about());
bot.on('message', useLimit(1, 10000), greeting());

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};
//dev mode
ENVIRONMENT !== 'production' && development(bot);

connectToDatabase().catch((error: Error) => {
  console.error('Database connection failed', error);
  process.exit();
});
