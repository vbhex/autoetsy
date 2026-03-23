export function log(msg: string, data?: any) {
  const ts = new Date().toLocaleTimeString();
  if (data !== undefined) {
    console.log(`[${ts}] ${msg}`, typeof data === 'string' ? data : JSON.stringify(data));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

export function logError(msg: string, err?: any) {
  const ts = new Date().toLocaleTimeString();
  const detail = err?.message || err || '';
  console.error(`[${ts}] ERROR: ${msg}`, detail);
}
