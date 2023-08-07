import { Markup } from "telegraf";

const timesMark = () => async (ctx: any) =>
ctx.reply(
	"Timesheet Keyboard",
	Markup.keyboard(["#timesheet report", "#timesheet daily", "#pia list"]).oneTime().resize(),
)

export {timesMark}