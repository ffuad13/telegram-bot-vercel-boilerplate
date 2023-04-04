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

    async function getFilteredTask(TOKEN: string, source: string) {
      const getTaskUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[4]}`;
      const getTask = await fetching(getTaskUrl, 'GET', '', TOKEN);
      const dataTask: any = getTask.data

      const filteredTask = dataTask.filter((data: any) => data.source == source);
      return filteredTask
    }

    if (tag === '#pia') {
      const payloadLogin = {
        body: `email=${email}&password=${password}&firebase_token=${process.env.FIREBASE_TOKEN}`,
        typeContent: 'application/x-www-form-urlencoded',
      };

      const loginUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[3]}`;
      const login = await fetching(loginUrl, 'POST', payloadLogin);
      const TOKEN = login.data.token;

      const getTaskData = await getFilteredTask(TOKEN, 'PIA')
      const selectedTask = getTaskData[typeTask - 1]

      const payloadTask = {
        body: JSON.stringify({
          source: 'PIA',
          task_id: selectedTask.task_id,
          hours: '8',
          ts_date: dates,
          n_hours: '8',
          progress: 95,
          activity_type_id: 2,
          activity_desc: 'Enhancement Core Meterai PERURI',
          trip_location_group_id: 2,
          working_progress: 95,
        }),
        typeContent: 'application/json'
      };

      const sendUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;
      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet Created\n${sendTask.data}`

      ctx.reply(taskMsg);
    }

    if (tag === '#ramen') {
      ctx.reply(`respon ramen`);
    }

    if (tag === '#bau') {
      ctx.reply(`respon bau`);
    }
  } catch (error) {
    console.log(error)
    ctx.reply(`an error occurred`);
  }
};

export { timesheet };
