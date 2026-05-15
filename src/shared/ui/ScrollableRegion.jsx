/**
 * Keeps very long “split” lists usable: after `threshold` rows, content scrolls inside a max-height pane.
 * All data still saves/loads — this is layout only.
 */
export default function ScrollableRegion({
  count = 0,
  threshold = 20,
  children,
  className = '',
  innerClassName = '',
  hint,
}) {
  const scroll = count >= threshold;
  if (!scroll) {
    return <div className={className}>{children}</div>;
  }
  const defaultHint = `${count} lines — scroll below. Totals and save still include every row.`;
  return (
    <div className={className}>
      {hint !== false && (
        <p className="text-[11px] text-muted mb-2 leading-snug">
          {hint === undefined || hint === null ? defaultHint : hint}
        </p>
      )}
      <div
        className={`max-h-[min(55vh,28rem)] overflow-y-auto overscroll-y-contain rounded-lg border border-border/80 ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
