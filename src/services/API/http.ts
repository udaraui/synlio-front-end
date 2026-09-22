export type ResponseType = 'arraybuffer' | 'blob' | 'json' | 'text';
 
interface PostOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  responseType?: ResponseType;
  credentials?: 'include' | 'same-origin' | 'omit';
}
 
export async function post<T>(
  url: string,
  body: any,
  options: PostOptions = {}
): Promise<T> {
  const { headers = { 'Content-Type': 'application/json' }, params, responseType = 'json', credentials } = options;
 
  // Build query string if params exist
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
 
  const res = await fetch(url + query, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials,
  });
 
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
 
  switch (responseType) {
    case 'arraybuffer':
      return (await res.arrayBuffer()) as unknown as T;
    case 'blob':
      return (await res.blob()) as unknown as T;
    case 'text':
      return (await res.text()) as unknown as T;
    case 'json':
    default:
      return res.json();
  }
}