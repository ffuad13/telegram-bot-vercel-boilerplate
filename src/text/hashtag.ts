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
    const sendUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;

    async function getToken() {
      const payloadLogin = {
        body: `email=${email}&password=${password}&firebase_token=${process.env.FIREBASE_TOKEN}`,
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

    if (tag === '#pia' && email && password) {
      const TOKEN = await getToken();

      const getTaskData = await getFilteredTask(TOKEN, 'PIA');
      const selectedTask = getTaskData[typeTask - 1];

      const payloadTask = {
        body: JSON.stringify({
          source: 'PIA',
          task_id: selectedTask.task_id,
          hours: '8',
          ts_date: dates,
          n_hours: '8',
          progress: 95,
          activity_type_id: 2,
          activity_desc: 'Enhancement Core e-Meterai PERURI',
          trip_location_group_id: 2,
          working_progress: 95,
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet PIA Submitted\n${sendTask.data}`;

      return ctx.reply(taskMsg);
    }

    if (tag === '#ramen' && email && password) {
      const TOKEN = await getToken();

      const getTaskData = await getFilteredTask(TOKEN, 'RAMEN');
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

    if (tag === '#bau' && email && password) {
      const TOKEN = await getToken()

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

    return ctx.replyWithMarkdownV2(`\`#pia email password taskOrder\`\n\`#ramen email password taskOrder\`\n\`#bau email password\``, { parse_mode: 'Markdown' })
  } catch (error) {
    console.log(error);
    ctx.reply(`an error occurred`);
  }
};

export { timesheet };
