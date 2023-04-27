import createDebug from 'debug';
import { fetching } from '../utils';
import { collections, TimeUser } from '../models';

const debug = createDebug('bot:timesheet_text');

const timesheet = () => async (ctx: any) => {
  debug('Triggered "timesheet" with hashtag');

  try {
    let [tag, txt1, txt2, txt3]: Array<string> = ctx.message['text'].split(' ');
    const typeTask: number = parseInt(txt1);
    const teleId: number = ctx.message.from.id;
    const URL = process.env.BASE_URL;
    const PATH: any = process.env.URL_PATH?.split(',');
    const dates = new Date()
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Jakarta',
      })
      .split('/')
      .reverse()
      .join('-');
    const sendUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;

    async function getLogin() {
      const payloadLogin = {
        body: `email=${txt1}&password=${txt2}&firebase_token=${process.env.FIREBASE_TOKEN}`,
        typeContent: 'application/x-www-form-urlencoded',
      };

      const loginUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[3]}`;
      const login = await fetching(loginUrl, 'POST', payloadLogin);

      return login.data.token;
    }

    async function getFilteredTask(TOKEN: string, source: string) {
      const getTaskUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[4]}`;
      const getTask = await fetching(getTaskUrl, 'GET', '', TOKEN);
      const dataTask: any = getTask.data;

      const filteredTask = dataTask.filter(
        (data: any) => data.source == source
      );
      return filteredTask;
    }

    async function QueryToken() {
      const qDb = (await collections.timeUser?.findOne({
        teleId,
      })) as unknown as TimeUser;
      if (!qDb) return false;
      return qDb;
    }

    if (txt1 && txt2 && txt3 === 'login') {
      const isLogin = await QueryToken();

      if (!isLogin) {
        const token: string = await getLogin();
        await collections.timeUser?.insertOne({ teleId, token });
        return ctx.reply(`login timesheet success`);
      } else {
        return ctx.reply(`Already login timesheet`);
      }
    }

    if (tag === '#pia' && typeof typeTask === 'number') {
      const qDb = (await QueryToken()) as TimeUser;
      const TOKEN: string = qDb.token;

      const getTaskData = await getFilteredTask(TOKEN, 'PIA');

      if (txt1 === 'list') {
        const mappedData = getTaskData.map((el: any, i: number) => {
          return `${i + 1} ${el.task_name}`;
        });
        const dataMsg = JSON.stringify(mappedData);
        return ctx.reply(dataMsg);
      }

      const selectedTask = getTaskData[typeTask - 1];

      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let bodyObj: any | undefined = customPayload.reduce(
        (obj: any, data) => {
          let [k, v] = data.split(':');
          obj[k] = v;
          return obj;
        },
        {}
      );

      const payloadTask = {
        body: JSON.stringify({
          source: 'PIA',
          task_id: selectedTask.task_id,
          hours: bodyObj.hours || '8',
          ts_date: bodyObj.date || dates,
          n_hours: bodyObj.hours || '8',
          progress: parseInt(bodyObj.progress) || 95,
          activity_type_id: 2,
          activity_desc: bodyObj.desc || 'Enhancement Core e-Meterai PERURI',
          trip_location_group_id: 2,
          working_progress: parseInt(bodyObj.progress) || 95,
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet PIA Submitted\n${sendTask.data}`;

      return ctx.reply(taskMsg);
    }

    if (tag === '#ramen' && typeof typeTask === 'number') {
      const qDb = (await QueryToken()) as TimeUser;
      const TOKEN: string = qDb.token;

      const getTaskData = await getFilteredTask(TOKEN, 'RAMEN');

      if (txt1 === 'list') {
        const mappedData = getTaskData.map((el: any, i: number) => {
          return `${i + 1} ${el.task_name}`;
        });
        const dataMsg = JSON.stringify(mappedData);
        return ctx.reply(dataMsg);
      }

      const selectedTask = getTaskData[typeTask - 1];

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: selectedTask.task_id,
          hours: 8,
          ts_date: dates,
          activity: 'Enhancement Core e-Meterai PERURI',
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet RAMEN Submitted\n${sendTask.post_mobile}`;

      return ctx.reply(taskMsg);
    }

    if (tag === '#bau') {
      const qDb = (await QueryToken()) as TimeUser;
      const TOKEN: string = qDb.token;

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: 'BU',
          hours: 8,
          ts_date: dates,
          activity: 'Enhancement Core e-Meterai PERURI',
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet BAU Submitted\n${sendTask.post_mobile}`;

      return ctx.reply(taskMsg);
    }

    if (tag === 'timesheet') {
      return ctx.replyWithMarkdownV2(
        `\`#pia email password taskOrder\`\n\`#ramen email password taskOrder\`\n\`#bau email password\``,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.log(error);
    ctx.reply(`an error occurred`);
  }
};

export { timesheet };
