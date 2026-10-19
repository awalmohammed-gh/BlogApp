/**
 * A staff member's uploaded avatar, or their initials when none exists.
 * Never substitutes a stock photo of another person.
 */
export const StaffAvatar = ({ src, name = "", className = "w-8 h-8 rounded-full", textClassName = "text-xs" }) => {
  if (src) {
    return <img src={src} alt={name} className={`${className} object-cover shrink-0`} />;
  }
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?";
  return (
    <span
      role="img"
      aria-label={name}
      className={`${className} ${textClassName} shrink-0 inline-flex items-center justify-center bg-blue-600 text-white font-bold select-none`}
    >
      {initials}
    </span>
  );
};

export default StaffAvatar;
