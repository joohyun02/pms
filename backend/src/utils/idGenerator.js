export function generateTaskId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `T-${datePart}-${random}`;
}
