/**
 * Minimal inline SVG icon set (16×16 grid, stroke-based) — no icon library.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Icon({ children, className = 'h-4 w-4', label }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} {...base}>
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  )
}

export function IconHome(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 7.5 8 2.5l5.5 5" />
      <path d="M3.5 6.8V13h9V6.8" />
      <path d="M6.5 13V9.5h3V13" />
    </Icon>
  )
}

export function IconWallet(props) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="3.75" width="12.5" height="8.5" rx="1.5" />
      <path d="M1.75 6.25h12.5" />
      <path d="M11.25 9.75h1.5" />
    </Icon>
  )
}

export function IconTarget(props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.75" />
      <circle cx="8" cy="8" r="2.75" />
      <circle cx="8" cy="8" r="0.4" className="fill-current stroke-none" />
    </Icon>
  )
}

export function IconRepeat(props) {
  return (
    <Icon {...props}>
      <path d="M12.5 6.5a4.75 4.75 0 0 0-8.6-1.6" />
      <path d="M4 2.8v2.3h2.3" />
      <path d="M3.5 9.5a4.75 4.75 0 0 0 8.6 1.6" />
      <path d="M12 13.2v-2.3H9.7" />
    </Icon>
  )
}

export function IconScale(props) {
  return (
    <Icon {...props}>
      <path d="M8 2.5v11" />
      <path d="M3 5h10" />
      <path d="M3 5 1.75 8.5a2.25 2.25 0 0 0 2.5 0L3 5Z" />
      <path d="M13 5l-1.25 3.5a2.25 2.25 0 0 0 2.5 0L13 5Z" />
      <path d="M5.5 13.5h5" />
    </Icon>
  )
}

export function IconBook(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h9.5v10H4a1.5 1.5 0 0 0-1.5 1.5v-10Z" />
      <path d="M2.5 13.5A1.5 1.5 0 0 1 4 12h9.5" />
    </Icon>
  )
}

export function IconSparkle(props) {
  return (
  <Icon {...props}>
      <path d="M8 2.5 9.3 6.7 13.5 8l-4.2 1.3L8 13.5 6.7 9.3 2.5 8l4.2-1.3L8 2.5Z" />
      <path d="M12.5 11.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z" />
    </Icon>
  )
}

export function IconPlus(props) {
  return (
    <Icon {...props}>
      <path d="M8 3.5v9M3.5 8h9" />
    </Icon>
  )
}

export function IconTrash(props) {
  return (
    <Icon {...props}>
      <path d="M2.75 4.25h10.5" />
      <path d="M6 4.25V3h4v1.25" />
      <path d="M4 4.25 4.75 13h6.5L12 4.25" />
      <path d="M6.75 6.5v4.5M9.25 6.5v4.5" />
    </Icon>
  )
}

export function IconReset(props) {
  return (
    <Icon {...props}>
      <path d="M2.75 8a5.25 5.25 0 1 0 1.55-3.7" />
      <path d="M2.5 2.5v2.5H5" />
    </Icon>
  )
}

export function IconChart(props) {
  return (
    <Icon {...props}>
      <path d="M2.75 13.25v-4" />
      <path d="M6.25 13.25V6.5" />
      <path d="M9.75 13.25V8.75" />
      <path d="M13.25 13.25v-8" />
    </Icon>
  )
}

export function IconCalc(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M5.5 5h5" />
      <path d="M5.5 8.5h.01M8 8.5h.01M10.5 8.5h.01M5.5 11h.01M8 11h.01M10.5 11h.01" />
    </Icon>
  )
}

export function IconSliders(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 5h11M2.5 11h11" />
      <circle cx="6" cy="5" r="1.75" />
      <circle cx="10" cy="11" r="1.75" />
    </Icon>
  )
}

export function IconPie(props) {
  return (
    <Icon {...props}>
      <path d="M13.25 8A5.25 5.25 0 1 1 8 2.75" />
      <path d="M8 2.75A5.25 5.25 0 0 1 13.25 8H8V2.75Z" />
    </Icon>
  )
}

export function IconTag(props) {
  return (
    <Icon {...props}>
      <path d="M8.4 2.5H13v4.6l-5.9 5.9a1.2 1.2 0 0 1-1.7 0L2.5 10.1a1.2 1.2 0 0 1 0-1.7L8.4 2.5Z" />
      <circle cx="10.6" cy="5.4" r="0.9" />
    </Icon>
  )
}

export function IconCalendar(props) {
  return (
    <Icon {...props}>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.5" />
      <path d="M2.25 6.25h11.5" />
      <path d="M5.25 2.25v2M10.75 2.25v2" />
    </Icon>
  )
}

export function IconGhost(props) {
  return (
    <Icon {...props}>
      <path d="M3 13.5V7a5 5 0 0 1 10 0v6.5l-1.6-1.2-1.7 1.2-1.7-1.2-1.7 1.2L3 13.5Z" />
      <circle cx="6.4" cy="7" r="0.6" className="fill-current stroke-none" />
      <circle cx="9.6" cy="7" r="0.6" className="fill-current stroke-none" />
    </Icon>
  )
}

export function IconMenu(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 5h11M2.5 8h11M2.5 11h11" />
    </Icon>
  )
}

export function IconUser(props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 13.5a5.25 5.25 0 0 1 10.5 0" />
    </Icon>
  )
}

export function IconPiggyBank(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 8.5a4.5 4.5 0 0 1 8.9-1h1.1a1.5 1.5 0 0 1 1.5 1.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-.7a4.4 4.4 0 0 1-1.3 1.6V13a.9.9 0 0 1-.9.9h-1a.9.9 0 0 1-.9-.9v-.4h-2.4v.4a.9.9 0 0 1-.9.9h-1a.9.9 0 0 1-.9-.9v-.4A4.5 4.5 0 0 1 3.5 8.5Z" />
      <circle cx="10.4" cy="8" r="0.6" className="fill-current stroke-none" />
      <path d="M6.4 8.4h2.4" />
  </Icon>
  )
}

export function IconX(props) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  )
}

export function IconSend(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 8 13.5 2.5 11 13.5 8 9 2.5 8Z" />
      <path d="M8 9l5.5-6.5" />
    </Icon>
  )
}
