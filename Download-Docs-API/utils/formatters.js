function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hrs = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  hrs = hrs % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
}

function formatDateOnly(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function calcAge(dob, closingDate) {
  const birth = new Date(dob);
  const ref = closingDate ? new Date(closingDate) : new Date();
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return '';
  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();
  if (days < 0) { months--; days += 30; }
  if (months < 0) { years--; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
  return parts.join(', ') || '0 Days';
}

function parseImageJson(jsonStr) {
  if (!jsonStr) return null;
  try { return JSON.parse(jsonStr); } catch { return null; }
}

module.exports = { formatDate, formatDateOnly, calcAge, parseImageJson };
