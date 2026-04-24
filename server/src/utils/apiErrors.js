export function validationError(res, code, message, status = 400) {
  return res.status(status).json({ code, message });
}
