interface AmountListProps {
  items: { name: string; amount?: string | null }[];
}

/**
 * 食材・調味料の「名前 分量」を1行ずつ箇条書きにする読み取り専用の一覧。
 * 作るときに見るのは分量なので、名前を控えめにして分量を大きく太くする。
 */
export function AmountList({ items }: AmountListProps) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-[15px] marker:text-[rgba(32,30,29,.4)]">
      {items.map((item, index) => (
        <li key={index}>
          <span className="opacity-70">{item.name}</span>
          {item.amount && <span className="ml-1.5 text-[17px] font-semibold">{item.amount}</span>}
        </li>
      ))}
    </ul>
  );
}
