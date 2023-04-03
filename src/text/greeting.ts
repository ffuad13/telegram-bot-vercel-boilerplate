import { Context } from 'telegraf';

import createDebug from 'debug';

const debug = createDebug('bot:greeting_text');

const replyToMessage = (ctx: Context, messageId: number, string: string) =>
  ctx.reply(string, {
    reply_to_message_id: messageId,
  });

const greeting = () => async (ctx: any) => {
  debug('Triggered "greeting" text command');

  const messageId = ctx.message?.message_id;
  const messages: string = ctx.message.text;

  if (messageId) {
    await replyToMessage(ctx, messageId, `You said, ${messages}!`);
  }
};

export { greeting };
