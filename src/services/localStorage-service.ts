export const getLocalData = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    if (!data || data === "undefined") return null;
    const obj = JSON.parse(data);

    if (obj && obj.expiresAt && Date.now() < obj.expiresAt) {
      return obj;
    }
  } catch (error) {
    console.error(`Error parsing JSON from localStorage for key "${key}":`, error);
  }

  return null;
};

export const setLocalData = (key: string, data: any) => {
  const ttlMs = process.env.LOCAL_DATA_TTL ? process.env.LOCAL_DATA_TTL : null;

  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  data.expiresAt = expiresAt;
  localStorage.setItem(key, JSON.stringify(data));
};


export const removeLocalData = (key: string) => {
  localStorage.removeItem(key);
};
