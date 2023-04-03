const fetching = async (
  url: string = '',
  method: string,
  payload: any,
  token: string = ''
): Promise<any> => {
	const URL = process.env.BASE_URL;
  const PATH: any = process.env.URL_PATH?.split(',');
	const contentLength = payload['body'].length

  let options: RequestInit = {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip',
      'Connection': 'Keep-Alive',
      'Content-Length': contentLength,
      'Content-Type': payload.typeContent,
      'Host': `${PATH[0]}.${URL}`,
      'User-Agent': 'okhttp/4.9.2',
    },
		body: payload.typeContent === 'application/x-www-form-urlencoded' ? payload.body : JSON.stringify(payload.body)
  };

	// console.log('options.headers :>> ', options);

  /* if (payload.typeContent == 'application/x-www-form-urlencoded') {
		options.body = payload.body
	} else {
    options.body = JSON.stringify(payload);
	} */

  try {
    const response = await fetch(url, options);
		const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error: any) {
    console.log(error)
    if (error instanceof TypeError) {
      throw new Error('Network Error: Please check your internet connection.');
    } else {
      throw new Error(`Request Failed: ${error.message}`);
    }
  }
};

export { fetching };
