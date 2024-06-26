import { Context } from 'telegraf';
import createDebug from 'debug';

import { author, name, version, description } from '../../package.json';

const debug = createDebug('bot:command_command');

const about = () => async (ctx: Context) => {
  const message = `*${name} ${version}*\n\`${description}\`\n${author}`;
  debug(`Triggered "about" command with message \n${message}`);
  await ctx.replyWithMarkdownV2(message, { parse_mode: 'Markdown' });
};

const start = () => async (ctx: Context) => {
  const userName = `${ctx.message?.from.first_name} ${ctx.message?.from.last_name}`;
  const startMessage: string = `Hello *${userName}*\nWelcome to kuliCode Bot!\n\n\/help\n\/about`;
  debug(`Triggered "start" command with message \n${startMessage}`);
  ctx.replyWithMarkdownV2(startMessage, { parse_mode: 'Markdown' });
};

const help = () => async (ctx: Context) => {
  ctx.replyWithMarkdownV2(`*This is help section*\n\n/help\n/about\nmore about this bot please consult author`, { parse_mode: 'Markdown' })
}

export { about, start, help };
