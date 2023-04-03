import createDebug from 'debug';
import { fetching } from '../utils';

const debug = createDebug('bot:timesheet_text');

const timesheet = () => async (ctx: any) => {
  debug('Triggered "timesheet" with hashtag');

  let [tag, email, password, taskType]: Array<string> =
    ctx.message['text'].split(' ');
  const typeTask: number = parseInt(taskType);

  try {
    const URL = process.env.BASE_URL;
    const PATH: any = process.env.URL_PATH?.split(',');
    const dates = new Date().toJSON().split('T')[0];

    if (tag === '#pia') {
      const payloadLogin = {
        body: `email=${email}&password=${password}&firebase_token=${process.env.FIREBASE_TOKEN}`,
        typeContent: 'application/x-www-form-urlencoded',
      };

      const loginUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[3]}`;
      const login = await fetching(loginUrl, 'POST', payloadLogin);
      console.log('login :>> ', login);

      ctx.reply(`respon pia`);
    }

    if (tag === '#ramen') {
      ctx.reply(`respon ramen`);
    }

    if (tag === '#bau') {
      ctx.reply(`respon bau`);
    }
  } catch (error) {
    console.log(error)
    ctx.reply(`Error error`);
  }
};

export { timesheet };
