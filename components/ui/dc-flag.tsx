interface Props {
  width?: number;
  height?: number;
  className?: string;
}

export function DCFlagIcon({ width = 28, height = 19, className }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 90 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        borderRadius: Math.round(width / 6),
        flexShrink: 0,
        boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
        border: '0.5px solid rgba(0,0,0,0.08)',
      }}
    >
      <rect width="90" height="60" fill="#FFFFFF" />
      <rect x="0" y="25" width="90" height="10" fill="#C8102E" />
      <rect x="0" y="42" width="90" height="10" fill="#C8102E" />
      <polygon fill="#C8102E" points="15,4.5 17.18,10.84 23.89,10.84 18.36,14.82 20.54,21.16 15,17.18 9.46,21.16 11.64,14.82 6.11,10.84 12.82,10.84" />
      <polygon fill="#C8102E" points="45,4.5 47.18,10.84 53.89,10.84 48.36,14.82 50.54,21.16 45,17.18 39.46,21.16 41.64,14.82 36.11,10.84 42.82,10.84" />
      <polygon fill="#C8102E" points="75,4.5 77.18,10.84 83.89,10.84 78.36,14.82 80.54,21.16 75,17.18 69.46,21.16 71.64,14.82 66.11,10.84 72.82,10.84" />
    </svg>
  );
}
