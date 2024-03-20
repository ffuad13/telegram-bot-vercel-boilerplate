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
    const tsURL: string = `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[5]}`;
    const approvalUrl: string = `https://${PATH[0]}.${URL}/${PATH[2]}approval/`
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
        typeContent: 1,
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
      const UrlDraft: string = tsURL + 'draft/';
      const getDraft = await fetching(UrlDraft, 'GET', '', TOKEN);
      return getDraft.data.timesheet;
    }

    async function getApproval(TOKEN: string) {
      const getAURL: string = approvalUrl + "?page=1"
      const getBUrl: string = approvalUrl + "bau/"
      const getA = await fetching(getAURL, 'GET', '', TOKEN)
      const getB = await fetching(getBUrl, 'GET', '', TOKEN)

      return [...getA.data.timesheet,...getB.data.timesheet]
    }

    async function QueryToken(): Promise<string> {
      const qDb = (await collections.timeUser?.findOne({
        teleId,
      })) as unknown as TimeUser;
      if (!qDb) return '';
      return qDb.token;
    }

    interface ObjTxt {
      hours: string;
      progress: string;
      date?: string;
      location: string;
      activity: string;
      list?: string;
    }
    function GetPayload() {
      let sliceNum: number = txt2 === 'f' ? 4 : 3
      let payloadText: string = txt2 === 'f' ? txt3 : txt2
      let customPayload: string[] | undefined = payloadText ? payloadText.split(',') : [];
      let restText: string | '' = ctx.message['text']
        .split(' ')
        .slice(sliceNum)
        .join(' ');

      let tmpObj: ObjTxt = customPayload.reduce((obj: any, data) => {
        const keyArr = ['list', 'hours', 'progress', 'date', 'location', 'activity'];
        let [k, v] = data.split(':');
        if (keyArr.includes(k)) {
          if (k === 'activity') {
            v += ' ' + restText;
          }
          obj[k] = v;
          return obj;
        }
      }, {});

      return tmpObj;
    }

    async function checkDate(bodyObj: ObjTxt) {
      const checkDay = new Date(bodyObj.date || dates).getDay();
      if ([0, 6].indexOf(checkDay) != -1) {
        return 'Weekend Boss';
      }

      const monthYear = (bodyObj.date || dates)
        .split('-')
      monthYear.pop()

      const dayOff = await (
        await fetch(`http://dayoffapi.vercel.app/api?month=${monthYear[1]}&year=${monthYear[0]}`)
      ).json();

      function ConvertDateFormat(inputDate: string) {
        const parsedDate = new Date(inputDate);

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      }

      function filterDay(array: any, targetDate: string) {
        return array.filter((item: any) => {
          const formattedItemDate = ConvertDateFormat(item.tanggal)
          const formattedTargetDate = ConvertDateFormat(targetDate)
          return formattedItemDate === formattedTargetDate;
        });
      }

      const isDayOff = filterDay(dayOff, bodyObj.date || dates)[0]?.is_cuti;
      if (isDayOff) {
        return 'Cuti Bung';
      } else if (isDayOff === false) {
        return 'Libur Bang';
      }
    }

    if (txt1 === 'purge') {
      await collections.timePlate?.deleteOne({ teleId });
      await collections.timeUser?.deleteOne({ teleId });
      return ctx.reply('token and template purged');
    }

    if (txt1 === 'createTemplate') {
      const tmpObj = GetPayload();
      delete tmpObj.date;

      await collections.timePlate?.updateOne(
        { teleId },
        { $set: { tmpObj } },
        { upsert: true }
      );
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
        const datas = await getDraft(TOKEN);
        if (datas.length <= 0) return ctx.reply('Draft is empty');

        let piaID: number[] = [];
        let ramenID: number[] = [];

        for (const entry of datas) {
          if (entry.total_hour >= 8) {
            entry.data.forEach((item: any) => {
              if (item.source === 'PIA') piaID.push(item.ts_id);
              if (item.source === 'RAMEN') ramenID.push(item.ts_id);
            });
          }
        }

        const form = new FormData();
        if (piaID.length > 0) {
          for (const el of piaID) {
            form.append('pia_send', `${el}`);
          }
        }
        if (ramenID.length > 0) {
          for (const el of ramenID) {
            form.append('ramen_send', `${el}`);
          }
        }

        const payload = {
          body: form,
        };
        await fetching(tsURL+'draft/', 'PUT', payload, TOKEN)

        return ctx.reply('All draft send to approver');
      }

      if (txt1 === 'draftlist') {
        const TOKEN: string = await QueryToken();
        const datas = await getDraft(TOKEN);
        if (datas.length <= 0) return ctx.reply('Draft is empty');

        let markdownString = `*Draft*\n====\n`;
        for (const [i, entry] of datas.entries()) {
          markdownString += `*${entry.date}*\n`;
          entry.data.forEach((item: any, idx: number) => {
            markdownString += `${i+1+idx}. ${item.source} - ${item.activity}. Hours: ${item.hours}\n`;
          });
        }
        return ctx.replyWithMarkdownV2(markdownString, {
          parse_mode: 'Markdown',
        });
      }

      if (txt1 === 'draftdelete' && txt2) {
        const selectNum: number = parseInt(txt2)
        if (!selectNum) return ctx.reply('Task order must be a number')

        const TOKEN: string = await QueryToken()
        const datas = await getDraft(TOKEN)
        if (datas.length <= 0) return ctx.reply('Draft is empty')

        let ids: any[] = []
        for (const list of datas) {
          list.data.forEach((item: any) => {
            const items = [item.source, item.ts_id]
            ids.push(items)
          })
        }
        const selectedId = ids[selectNum-1]
        const payload = {
          body: JSON.stringify({
            source: selectedId[0],
            ts_id: selectedId[1]
          }),
          typeContent: 0,
        }
        await fetching(tsURL+'delete/', 'POST', payload, TOKEN)
        return ctx.reply('draft deleted')
      }

      if (txt1 === 'approv') {
        const TOKEN: string = await QueryToken()
        const datas = await getApproval(TOKEN)
        if (datas.length <= 0) return ctx.reply('Approval empty');

        let piaID: number[] = [];
        let ramenID: number[] = [];

        for (const entry of datas) {
          if (entry.status === 'Submitted') {
            if (entry.source === 'PIA') piaID.push(entry.ts_id);
            if (entry.source === 'RAMEN') ramenID.push(entry.ts_id);
          }
        }

        const urlencoded = new URLSearchParams()
        if (piaID.length > 0) {
          for (const el of piaID) {
            urlencoded.append('pia_approved', `${el}`)
          }
        }
        if (ramenID.length > 0) {
          for (const el of ramenID) {
            urlencoded.append('ramen_approved', `${el}`)
          }
        }

        const payload = {
          body: urlencoded,
          typeContent: 1,
        }

        await fetching(approvalUrl, 'POST', payload, TOKEN)

        return ctx.reply('Timesheet Approved')
      }

      if (txt1 === 'report' || txt1 === 'daily') {
        const TOKEN: string = await QueryToken();
        const { user_id, user_name } = decodeJWT(TOKEN);
        const date: string = txt2 || dates.split('-').join('').substring(0, 6);

        const getUrl: string =
          txt1 === 'report'
            ? `https://${PATH[0]}.${URL}/${PATH[2]}${PATH[6]}${PATH[7]}?periode=${date}`
            : `${tsURL}?periode=${date}`;

        const getReport = await fetching(getUrl, 'GET', '', TOKEN);

        if (txt1 === 'report') {
          const { periode, hour, workhours, entry, workdays } = getReport.data;

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
          const nonEmptyColor = getReport.data.timesheet
            .filter((entry: any) => entry.color !== '')
            .map((entry: any) => ({ [entry.title]: entry.color }));

          function arrayToMarkdown(data: any) {
            let markdownString = `*Name*: ${user_name}\n*NIK*: ${user_id}\n`;

            data.forEach((item: any, index: number) => {
              const key: any = Object.keys(item);
              markdownString += `${index + 1} *${key}*  ${
                item[key] === 'Green'
                  ? '✅'
                  : item[key] === 'Blue'
                  ? '🖊️'
                  : '⏳'
              }\n`;
            });

            return markdownString;
          }

          const markdownString = arrayToMarkdown(nonEmptyColor);

          return ctx.replyWithMarkdownV2(markdownString, {
            parse_mode: 'Markdown',
          });
        }
      }
    }

    if (tag === '#pia' && txt1 && typeof typeTask === 'number') {
      const bodyObj = GetPayload();

      if (txt2 !== 'f') {
        const isOff = await checkDate(bodyObj);
        if (isOff) return ctx.reply(isOff);
      }

      const TOKEN: string = await QueryToken();

      const getTaskData = await getFilteredTask(TOKEN, 'PIA');

      if (bodyObj.list === 'details') {
        const urlList = `https://${PATH[0]}.${URL}/${PATH[1]}/apiPrd/${PATH[5]}my_task/`
        const {results} = await fetching(urlList, "GET", "", TOKEN)
        const {TASK_NAME, PROJECT_NAME, USER_ID, USER_NAME, BU_NAME, ASSIGNED_ROLE, PM_NAME} = results[typeTask]
        const replyText = `*PIA Task Details*
===========
Task  : ${TASK_NAME}
Project: ${PROJECT_NAME}
User  : ${USER_NAME} | ${USER_ID}
Unit  : ${BU_NAME}
Role  : ${ASSIGNED_ROLE}
PM    : ${PM_NAME}`
        return ctx.replyWithMarkdownV2(replyText, { parse_mode: 'Markdown' })
      }
      if (txt1 === 'list') {
        let replytext = `*PIA List*\n=======\n`;
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const tmplDb = (await collections.timePlate?.findOne({
        teleId,
      })) as unknown as TimePlate;
      let {
        hours = null,
        progress = null,
        location = null,
        activity = null,
      }: any = tmplDb?.tmpObj ?? {};

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
          activity_desc:
            bodyObj.activity ||
            activity ||
            'Enhancement Core Project Application',
          trip_location_group_id: parseInt(bodyObj.location || location) || 2,
          working_progress: parseInt(bodyObj.progress || progress) || 95,
        }),
        typeContent: 0,
      };

      const sendTask = await fetching(tsURL, 'POST', payloadTask, TOKEN);

      let datas = JSON.parse(sendTask.data);

      let replyTxt = `Timesheet PIA Drafted\n=======\n`;
      Object.entries(datas).forEach(([key, value]) => {
        replyTxt += `${key}: ${value}\n`;
      });

      return ctx.reply(replyTxt);
    }

    if (tag === '#ramen' && txt1 && typeof typeTask === 'number') {
      const bodyObj = GetPayload();

      if (txt2 !== 'f') {
        const isOff = await checkDate(bodyObj);
        if (isOff) return ctx.reply(isOff);
      }

      const TOKEN: string = await QueryToken();

      const getTaskData = await getFilteredTask(TOKEN, 'RAMEN');

      if (txt1 === 'list') {
        let replytext = `*Ramen List*\n=======\n`;
        getTaskData.forEach((el: any, i: number) => {
          replytext += `${i + 1} - ${el.task_name}\n`;
        });

        return ctx.replyWithMarkdownV2(replytext, { parse_mode: 'Markdown' });
      }

      const tmplDb = (await collections.timePlate?.findOne({
        teleId,
      })) as unknown as TimePlate;
      let { hours = null, activity = null }: any = tmplDb?.tmpObj ?? {};

      const selectedTask = getTaskData[typeTask - 1];
      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: selectedTask.task_id,
          hours: parseInt(bodyObj.hours || hours) || 8,
          ts_date: bodyObj.date || dates,
          activity:
            bodyObj.activity ||
            activity ||
            'Enhancement Core Project Application',
        }),
        typeContent: 0,
      };

      const sendTask = await fetching(tsURL, 'POST', payloadTask, TOKEN);

      let replyTxt = `Timesheet RAMEN Drafted\n=======\n`;
      Object.entries(sendTask.post_mobile).forEach(([key, value]) => {
        replyTxt += `${key}: ${value}\n`;
      });

      return ctx.reply(replyTxt);
    }

    if (tag === '#bau' && txt1 && typeof typeTask === 'number') {
      let bodyObj = GetPayload();

      if (txt2 !== 'f') {
        const isOff = await checkDate(bodyObj);
        if (isOff) return ctx.reply(isOff);
      }

      const TOKEN: string = await QueryToken();

      const tmplDb = (await collections.timePlate?.findOne({
        teleId,
      })) as unknown as TimePlate;
      let { hours = null, activity = null }: any = tmplDb?.tmpObj ?? {};

      const taskId = ["CT", "SA", "BU", "TR", "MT", "ID"]

      const payloadTask = {
        body: JSON.stringify({
          source: 'RAMEN',
          task_id: taskId[typeTask - 1],
          hours: parseInt(bodyObj.hours || hours) || 8,
          ts_date: bodyObj.date || dates,
          activity:
            bodyObj.activity ||
            activity ||
            'Enhancement Core Project Application',
        }),
        typeContent: 0,
      };

      const sendTask = await fetching(tsURL, 'POST', payloadTask, TOKEN);

      let replyTxt = `Timesheet BAU Drafted\n=======\n`;
      Object.entries(sendTask.post_mobile).forEach(([key, value]) => {
        replyTxt += `${key}: ${value}\n`;
      });

      return ctx.reply(replyTxt);
    }

    return ctx.replyWithMarkdownV2(
      `*Login*:
\`#timesheet email password **login\`
*List task:*
\`#pia or #ramen list\`
*Submit*:
\`#pia taskOrder *<payload>\`
\`#ramen taskOrder *<payload>\`
\`#bau taskType *<payload>\`
*Report*:
\`#timesheet report *<yyyymm>\`
\`#timesheet daily\`
*Template*:
\`#timesheet createTemplate **<payload>\`
*Draft*:
\`#timesheet draftlist\`
\`#timesheet draftsend\`
\`#timesheet draftdelete *number\`
\`#timesheet approv\`

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
