interface ContractRuleListProps {
  title: string;
  rules: string[];
}

export function ContractRuleList({
  title,
  rules,
}: ContractRuleListProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <ul className="mt-4 space-y-2 text-sm text-neutral-700">
        {rules.map((rule) => (
          <li key={rule} className="rounded-xl bg-neutral-50 px-3 py-2">
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}
