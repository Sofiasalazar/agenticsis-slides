interface LogoProps {
  size?: number
  color?: string
}

export function Logo({ size = 32, color = '#FFFFFF' }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#000000" />
      <rect
        x="118" y="210" width="276" height="170" rx="40"
        stroke={color} strokeWidth="28" fill="none"
      />
      <circle cx="208" cy="295" r="18" fill={color} />
      <circle cx="304" cy="295" r="18" fill={color} />
      <rect x="244" y="150" width="24" height="70" rx="12" fill={color} />
      <circle cx="256" cy="130" r="38" stroke={color} strokeWidth="24" fill="none" />
    </svg>
  )
}
