import createDebug from 'debug';
import { decodeJWT, fetching } from '../utils';
import { collections, TimeUser, TimePlate } from '../models';

const debug = createDebug('bot:timesheet_text');

const timesheet = () => async (ctx: any) => {
  debug('Triggered "timesheet" with hashtag');

  try {
    let [tag, txt1, txt2, txt3]: Array<string> = ctx.message['text'].split(' ');
    const typeTask: number = parseInt(txt1);
    const teleId: number = ctx.message.from.id;
    const URL = process.env.BASE_URL;
    const PATH: any = process.env.URL_PATH?.split(',');
    const sendUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;
    const dates = new Date()
      .toLocaleDateString('en-GB', {
        timeZone: 'Asia/Jakarta',
      })
      .split('/')
      .reverse()
      .join('-');

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

    if (txt1 === 'purge') {
      await collections.timePlate?.deleteOne({teleId})
      await collections.timeUser?.deleteOne({teleId})
      return ctx.reply('token and template purged')
    }

    if (txt1 === 'createTemplate') {
      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let restText: string = ctx.message['text'].split(' ').slice(3).join(' ');

      let tmpObj: any | undefined = customPayload.reduce((obj: any, data) => {
        let [k, v] = data.split(':');
        if (k === 'activity') {
          v += ' ' + restText;
        }
        obj[k] = v;
        return obj;
      }, {});

      const isExist = await collections.timePlate?.countDocuments({teleId})
      isExist ? await collections.timePlate?.updateOne({teleId}, {$set: {tmpObj}}) : await collections.timePlate?.insertOne({ teleId, tmpObj });
      return ctx.reply(`template crated`);
    }

    if (tag === '#timesheet' && txt1) {
      if (txt2 && txt3 === 'login') {
        const isLogin = await QueryToken();

        if (!isLogin) {
          const token: string = await getLogin();
          await collections.timeUser?.insertOne({ teleId, token });
          return ctx.reply(`login timesheet success`);
        } else {
          return ctx.reply(`Already login timesheet`);
        }
      }

      if (txt1 === 'report') {
        const qDb = (await QueryToken()) as TimeUser;
        const TOKEN: string = qDb.token;
        const { user_id, user_name } = decodeJWT(TOKEN);
        const date: string = txt2 || dates.split('-').join('').substring(0, 6);
        const getUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[6]}${PATH[7]}?periode=${date}`;

        const getReport = await fetching(getUrl, 'GET', '', TOKEN);
        const {periode, hour, workhours, entry, workdays} = getReport.data

        return ctx.replyWithMarkdownV2(
          `*Name*: ${user_name}
*NIK*: ${user_id}
-------
*Periode*: ${periode}
*Workhours*: ${hour} from ${workhours}
*Workdays*: ${entry} from ${workdays}
`,
          { parse_mode: 'Markdown' }
        );
      }

      if (txt1 === 'daily') {
        const qDb = (await QueryToken()) as TimeUser;
        const TOKEN: string = qDb.token;
        const { user_id, user_name } = decodeJWT(TOKEN);
        const date: string = dates.split('-').join('').substring(0, 6);
        const getUrl = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}?periode=${date}`;

        const getReport = await fetching(getUrl, 'GET', '', TOKEN);
        const nonEmptyColor = getReport.data.timesheet.filter((entry: any) => entry.color !== "").map((entry: any )=> entry.title);

        function arrayToMarkdown(data: any) {
          let markdownString =`*Name*: ${user_name}\n*NIK*: ${user_id}\n`;

          data.forEach((item: any) => {
            markdownString += `*${item}*  ✅\n`;
          });

          return markdownString;
        }

        const markdownString = arrayToMarkdown(nonEmptyColor);

        return ctx.replyWithMarkdownV2(markdownString, { parse_mode: 'Markdown' });
      }
    }

    if (tag === '#pia' && txt1 && typeof typeTask === 'number') {
      const qDb = (await QueryToken()) as TimeUser;
      const TOKEN: string = qDb.token;

      const getTaskData = await getFilteredTask(TOKEN, 'PIA');

      if (txt1 === 'list') {
        let replytext = `*PIA List*\n=======\n`
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const selectedTask = getTaskData[typeTask - 1];

      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let bodyObj: any | undefined = customPayload.reduce((obj: any, data) => {
        let [k, v] = data.split(':');
        obj[k] = v;
        return obj;
      }, {});

      const tmplDb = (await collections.timePlate?.findOne({teleId})) as unknown as TimePlate
      // const {hours='', progress='', location='', activity=''}: any = tmplDb?.tmpObj
      let {hours=null, progress=null, location=null, activity=null}: any = tmplDb?.tmpObj ?? {}

      const payloadTask = {
        body: JSON.stringify({
          source: 'PIA',
          task_id: selectedTask.task_id,
          hours: bodyObj.hours || hours || '8',
          ts_date: bodyObj.date || dates,
          n_hours: bodyObj.hours || hours || '8',
          progress: parseInt(bodyObj.progress || progress) || 95,
          activity_type_id: parseInt(bodyObj.location || location) || 2,
          activity_desc:
            bodyObj.activity || activity || 'Enhancement Core Project Application',
          trip_location_group_id: parseInt(bodyObj.location || location) || 2,
          working_progress: parseInt(bodyObj.progress || progress) || 95,
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      let datas = JSON.parse(sendTask.data)

      let replyTxt = `Timesheet PIA Submitted\n=======\n`
      Object.entries(datas).forEach(([key, value]) => {
        replyTxt += `${key}: ${value}\n`
      })

      return ctx.reply(replyTxt);
    }

    if (tag === '#ramen' && txt1 && typeof typeTask === 'number') {
      const qDb = (await QueryToken()) as TimeUser;
      const TOKEN: string = qDb.token;

      const getTaskData = await getFilteredTask(TOKEN, 'RAMEN');

      if (txt1 === 'list') {
        let replytext = `*Ramen List*\n=======\n`
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const selectedTask = getTaskData[typeTask - 1];

      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let bodyObj: any | undefined = customPayload.reduce((obj: any, data) => {
        let [k, v] = data.split(':');
        obj[k] = v;
        return obj;
      }, {});

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: selectedTask.task_id,
          hours: parseInt(bodyObj.hours) || 8,
          ts_date: bodyObj.date || dates,
          activity: bodyObj.activity || 'Enhancement Core e-Meterai PERURI',
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

      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let bodyObj: any | undefined = customPayload.reduce((obj: any, data) => {
        let [k, v] = data.split(':');
        obj[k] = v;
        return obj;
      }, {});

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: 'BU',
          hours: parseInt(bodyObj.hours) || 8,
          ts_date: bodyObj.date || dates,
          activity: bodyObj.activity || 'Enhancement Core e-Meterai PERURI',
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet BAU Submitted\n${sendTask.post_mobile}`;

      return ctx.reply(taskMsg);
    }

    return ctx.replyWithMarkdownV2(
      `*Login*:
\`#timesheet email password login\`
*List task:*
\`#pia or #ramen list\`
*Submit*:
\`#pia taskOrder *<payload>\`
\`#ramen taskOrder *<payload>\`
\`#bau *<payload>\`
*Report*:
\`#timesheet report *<yyyymm>\`
\`#timesheet daily\`
*Template*:
\`#timesheet createTemplate **<payload>\`

_* is optional_
_** is mandatory_`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.log(error);
    ctx.reply(`an error occurred`);
  }
};

export { timesheet };
