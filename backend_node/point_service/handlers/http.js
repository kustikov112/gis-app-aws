const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: defaultHeaders,
  body: JSON.stringify(payload),
});
