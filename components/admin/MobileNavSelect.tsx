"use client";

export default function MobileNavSelect({ items }: { items: { href: string; label: string }[] }) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) window.location.href = e.target.value;
      }}
      className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
    >
      <option value="" disabled>
        Ir a...
      </option>
      {items.map((item) => (
        <option key={item.href} value={item.href}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
