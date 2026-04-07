export function userContext(req, res, next) {
  const name = req.header("X-USER-NAME") || "Unknown";
  const role = req.header("X-USER-ROLE") || "EMPLOYEE"; // default

  req.user = { name, role };
  next();
}
