"use client";

type Item = { href: string; label: string };

export default function MobileNavSelect({ grupos }: { grupos: { titulo: string; items: Item[] }[] }) {
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
      {grupos.map((g) => (
        <optgroup key={g.titulo} label={g.titulo}>
          {g.items.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
