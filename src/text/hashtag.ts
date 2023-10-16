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
    const PATH: string[] = process.env.URL_PATH?.split(',') as string[];
    const sendUrl: string = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;
    const DraftUrl: string = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}draft/`;
    const dates: string = new Date()
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

      const loginUrl: string = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[3]}`;
      const login = await fetching(loginUrl, 'POST', payloadLogin);

      return login.data.token;
    }

    async function getFilteredTask(TOKEN: string, source: string) {
      const getTaskUrl: string = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[4]}`;
      const getTask = await fetching(getTaskUrl, 'GET', '', TOKEN);
      const dataTask: any = getTask.data;

      const filteredTask = dataTask.filter(
        (data: any) => data.source == source
      );
      return filteredTask;
    }

    async function getDraft(TOKEN: string) {
      const getDraftUrl: string = DraftUrl;
      const getDraft = await fetching(getDraftUrl, 'GET', '', TOKEN);
      const dataDraft: any = getDraft.data.timesheet;

      const tsIds = [];

      for (const entry of dataDraft) {
        if (entry.total_hour >= 8) {
          tsIds.push(...entry.data.map((item: any) => item.ts_id));
        } else {
          ctx.reply('some draft must be 8 hour or more')
        }
      }

      return tsIds;
    }

    async function QueryToken(): Promise<string> {
      const qDb = await collections.timeUser?.findOne({
        teleId,
      }) as unknown as TimeUser;
      if (!qDb) return '';
      return qDb.token;
    }

    interface ObjTxt {
      hours: string
      progress: string
      date?: string
      location: string
      activity: string
    }
    function GetPayload() {
      let customPayload: string[] | undefined = txt2 ? txt2.split(',') : [];
      let restText: string | '' = ctx.message['text'].split(' ').slice(3).join(' ');

      let tmpObj: ObjTxt = customPayload.reduce((obj: any , data) => {
        const keyArr = ['hours','progress','date','location','activity'];
        let [k, v] = data.split(':');
        if (keyArr.includes(k)) {
          if (k === 'activity') {
            v += ' ' + restText;
          }
          obj[k] = v;
          return obj;
        }
      }, {});

      return tmpObj
    }

    async function checkDate(bodyObj: ObjTxt) {
      const checkDay = new Date((bodyObj.date || dates)).getDay()
      if ([0, 6].indexOf(checkDay) != -1) {
        return 'Weekend Boss'
      }
      const monthNow = (bodyObj.date || dates).split('-').join('').substring(5, 6)
      const dayOff = await (await fetch(`https://dayoffapi.vercel.app/api?month=${monthNow}`)).json()

      function filterDay(array:any, targetDate:string) {
        return array.filter((item:any) => {
          const formattedTargetDate = new Date(targetDate).toISOString().slice(0, 10);
          const formattedItemDate = new Date(item.tanggal).toISOString().slice(0, 10);
          return formattedItemDate === formattedTargetDate;
        });
      }

      const isDayOff = filterDay(dayOff, (bodyObj.date || dates))[0]?.is_cuti;
      if (isDayOff) {
        return 'Cuti Bung'
      } else if (isDayOff === false) {
        return 'Libur Bang'
      }
    }

    if (txt1 === 'purge') {
      await collections.timePlate?.deleteOne({teleId})
      await collections.timeUser?.deleteOne({teleId})
      return ctx.reply('token and template purged')
    }

    if (txt1 === 'createTemplate') {
      const tmpObj = GetPayload()
      delete tmpObj.date

      await collections.timePlate?.updateOne({teleId}, {$set: {tmpObj}}, {upsert: true})
      return ctx.reply(`template crated`);
    }

    if (tag === '#timesheet' && txt1) {
      if (txt2 && txt3 === 'login') {
        const isLogin: string = await QueryToken();

        if (!isLogin) {
          const token: string = await getLogin();
          await collections.timeUser?.insertOne({ teleId, token });
          return ctx.reply(`login timesheet success`);
        } else {
          return ctx.reply(`Already login timesheet`);
        }
      }

      if (txt1 === 'draftsend') {
        const TOKEN: string = await QueryToken();
        const datas = await getDraft(TOKEN)

        if (datas.length <= 0) return ctx.reply('Draft is empty')

        const form = new FormData()
        for (const el of datas) {
          form.append("pia_send", `${el}`)
        }

        const payload = {
          body: form,
        }
        await fetching(DraftUrl, 'PUT', payload, TOKEN)

        return ctx.reply('All draft send to approver')
      }

      if (txt1 === 'report' || txt1 === 'daily') {
        const TOKEN: string = await QueryToken();
        const { user_id, user_name } = decodeJWT(TOKEN);
        const date: string = txt2 || dates.split('-').join('').substring(0, 6);

        const getUrl: string = txt1 === 'report' ? `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[6]}${PATH[7]}?periode=${date}` : `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}?periode=${date}`;

        const getReport = await fetching(getUrl, 'GET', '', TOKEN);

        if (txt1 === 'report') {
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
        } else {
          const nonEmptyColor = getReport.data.timesheet.filter((entry: any) => entry.color !== "").map((entry: any )=> ({[entry.title]:entry.color}));

          function arrayToMarkdown(data: any) {
            let markdownString =`*Name*: ${user_name}\n*NIK*: ${user_id}\n`;

            data.forEach((item: any, index:number) => {
              const key: any = Object.keys(item)
              markdownString += `${index + 1} *${key}*  ${item[key] === "Green" ? '✅' : item[key] === "Blue" ? '🖊️' : '⏳'}\n`;
            });

            return markdownString;
          }

          const markdownString = arrayToMarkdown(nonEmptyColor);

          return ctx.replyWithMarkdownV2(markdownString, { parse_mode: 'Markdown' });
        }

      }
    }

    if (tag === '#pia' && txt1 && typeof typeTask === 'number') {
      const bodyObj = GetPayload();

      const isOff = await checkDate(bodyObj)
      if (isOff) return ctx.reply(isOff)

      const TOKEN: string = await QueryToken();

      const getTaskData = await getFilteredTask(TOKEN, 'PIA');

      if (txt1 === 'list') {
        let replytext = `*PIA List*\n=======\n`
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const tmplDb = (await collections.timePlate?.findOne({teleId})) as unknown as TimePlate
      let {hours=null, progress=null, location=null, activity=null}: any = tmplDb?.tmpObj ?? {}

      const selectedTask = getTaskData[typeTask - 1];
      const payloadTask = {
        body: JSON.stringify({
          source: 'PIA',
          task_id: selectedTask.task_id,
          hours: bodyObj.hours || hours || '8',
          ts_date: bodyObj.date || dates,
          n_hours: bodyObj.hours || hours || '8',
          progress: parseInt(bodyObj.progress || progress) || 95,
          activity_type_id: parseInt(bodyObj.location || location) || 2,
          activity_desc: bodyObj.activity || activity || 'Enhancement Core Project Application',
          trip_location_group_id: parseInt(bodyObj.location || location) || 2,
          working_progress: parseInt(bodyObj.progress || progress) || 95,
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      let datas = JSON.parse(sendTask.data)

      let replyTxt = `Timesheet PIA Drafted\n=======\n`
      Object.entries(datas).forEach(([key, value]) => {
        replyTxt += `${key}: ${value}\n`
      })

      return ctx.reply(replyTxt);
    }

    if (tag === '#ramen' && txt1 && typeof typeTask === 'number') {
      const bodyObj = GetPayload();

      const isOff = await checkDate(bodyObj)
      if (isOff) return ctx.reply(isOff)

      const TOKEN: string = await QueryToken();

      const getTaskData = await getFilteredTask(TOKEN, 'RAMEN');

      if (txt1 === 'list') {
        let replytext = `*Ramen List*\n=======\n`
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const tmplDb = (await collections.timePlate?.findOne({teleId})) as unknown as TimePlate
      let {hours=null, activity=null}: any = tmplDb?.tmpObj ?? {}

      const selectedTask = getTaskData[typeTask - 1];
      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: selectedTask.task_id,
          hours: parseInt(bodyObj.hours || hours) || 8,
          ts_date: bodyObj.date || dates,
          activity: bodyObj.activity || activity || 'Enhancement Core Project Application',
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet RAMEN Submitted\n${sendTask.post_mobile}`;

      return ctx.reply(taskMsg);
    }

    if (tag === '#bau') {
      let bodyObj = GetPayload();

      const isOff = await checkDate(bodyObj)
      if (isOff) return ctx.reply(isOff)

      const TOKEN: string = await QueryToken();

      const tmplDb = (await collections.timePlate?.findOne({teleId})) as unknown as TimePlate
      let {hours=null, activity=null}: any = tmplDb?.tmpObj ?? {}

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: 'BU',
          hours: parseInt(bodyObj.hours || hours) || 8,
          ts_date: bodyObj.date || dates,
          activity: bodyObj.activity || activity || 'Enhancement Core Project Application',
        }),
        typeContent: 'application/json',
      };

      const sendTask = await fetching(sendUrl, 'POST', payloadTask, TOKEN);

      const taskMsg = `Message: Timesheet BAU Submitted\n${sendTask.post_mobile}`;

      return ctx.reply(taskMsg);
    }

    return ctx.replyWithMarkdownV2(
      `*Login*:
\`#timesheet email password **login\`
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
*Submit Draft*:
\`#timesheet draftsend\`

_* is optional_
_** is mandatory_`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.log(error);
    ctx.reply(`error:tms`);
  }
};

export { timesheet };
