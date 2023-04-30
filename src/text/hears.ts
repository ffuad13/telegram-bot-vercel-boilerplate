import { Context } from 'telegraf';
import createDebug from 'debug';

const debug = createDebug('bot:hear_text');

const gempa = () => async (ctx: Context) => {
  debug('Triggered "gempa" text command');

  const BMKG_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/'
  const {text} = ctx.message as any

  if (text === "gempaterkini") {
    const getData = await fetch(
      `${BMKG_URL}gempaterkini.json`
    );
    const dataGempa = await getData.json();

    let listGempa = []

    for (let i = 0; i < 5; i++) {
      const arr = dataGempa.Infogempa.gempa[i];
      let element = {
        Tanggal: arr.Tanggal,
        Jam: arr.Jam,
        Magnitude: arr.Magnitude,
        Wilayah: arr.Wilayah,
        Potensi: arr.Potensi
      }
      listGempa.push(element)
    }

    const captions = JSON.stringify(listGempa)
    return ctx.reply(captions + '\n_source: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)_', {parse_mode: 'Markdown'})
  }

  const getData = await fetch(
    `${BMKG_URL}autogempa.json`
  );
  const dataGempa = await getData.json();
	const captions = JSON.stringify(dataGempa.Infogempa.gempa)

  return ctx.sendPhoto(`${BMKG_URL}${dataGempa.Infogempa.gempa.Shakemap}`, {
    caption: captions + '\n_source: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)_',
    parse_mode: 'Markdown'
  });
};

const test = () => async (ctx: Context) => {
  const {text} = ctx.message as any

  console.log(text)
  return ctx.reply(`ini test`)
}

export { gempa, test };
