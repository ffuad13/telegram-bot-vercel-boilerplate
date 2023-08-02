const sendLog = function (msg: string) {
  const { BOT_TOKEN, GCHAT_ID } = process.env;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    body: JSON.stringify({
      chat_id: GCHAT_ID,
      text: msg,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export { sendLog };
