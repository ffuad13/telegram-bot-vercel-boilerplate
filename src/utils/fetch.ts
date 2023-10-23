const fetching = async (
  url: string = '',
  method: string,
  payload: any,
  token: string = ''
): Promise<any> => {
  const URL = process.env.BASE_URL;
  const PATH: any = process.env.URL_PATH?.split(',');

  const header = {
    accept: 'application/json, text/plain, */*',
    'accept-encoding': 'gzip',
    authorization: `Bearer ${token}`,
    host: `${PATH[0]}.${URL}`,
    'user-agent': 'okhttp/4.9.2',
    'content-type': payload.typeContent,
  }

  let options: RequestInit = {
    method: method,
    headers: header,
  };

  if (method === 'POST' || method === 'PUT') options.body = payload.body;
  if (payload.body instanceof FormData) delete header['content-type'];

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      throw new Error(data);
    }
  } catch (error: any) {
    console.log(error);
    if (error instanceof TypeError) {
      throw new Error('Network Error: Please check your internet connection.');
    } else {
      throw new Error(`Request Failed: ${error.message}`);
    }
  }
};

export { fetching };
