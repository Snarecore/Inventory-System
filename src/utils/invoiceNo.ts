// Shape: <businessCode>-<YYYY><MM><DD><HH><mm><ss><ms>
// e.g. 28488-20261007090736718


const pad = (value: number | string, length = 2): string => String(value).padStart(length, "0");

export const makeInvoiceNo = (businessCode?: string | number): string => {
  const code = businessCode ? String(businessCode).trim() : "";
  if (!code) return "";
  const now = new Date();
  return (
    `${code}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
  );
};

export default makeInvoiceNo;
