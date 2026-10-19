export const formatPublicDate = (date, general = {}) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const timeZone = general.timezone || "Africa/Accra";
  if (["YYYY-MM-DD", "DD/MM/YYYY"].includes(general.dateFormat)) {
    const parts = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).formatToParts(parsed);
    const part = (type) => parts.find((p) => p.type === type)?.value;
    return general.dateFormat === "YYYY-MM-DD" ? `${part("year")}-${part("month")}-${part("day")}` : `${part("day")}/${part("month")}/${part("year")}`;
  }
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone });
};
