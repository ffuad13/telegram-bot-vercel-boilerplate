import { Context } from 'telegraf';
import createDebug from 'debug';

const debug = createDebug('bot:hear_text');

const gempa = () => async (ctx: any) => {
  debug('Triggered "gempa" text command');
  const getData = await fetch(
    'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json'
  );
  const dataGempa = await getData.json();
	const captions = JSON.stringify(dataGempa.Infogempa.gempa)

  return ctx.sendPhoto(`https://data.bmkg.go.id/DataMKG/TEWS/${dataGempa.Infogempa.gempa.Shakemap}`, {
    caption: captions,
  });
};

const test = () => async (ctx: Context) => {
  const {text} = ctx.message as any

  console.log(text)
  return ctx.reply(`ini test`)
}

export { gempa, test };
