interface IconProps {
  className?: string
}

// Material Icons 래퍼 컴포넌트
function MaterialIcon({ name, outlined = true, className = "" }: { name: string; outlined?: boolean; className?: string }) {
  const iconClass = outlined ? "material-icons-outlined" : "material-icons"
  return <span className={`${iconClass} ${className}`}>{name}</span>
}

export function PrayingHandsIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="volunteer_activism" className={className} />
}

export function LockIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="lock" className={className} />
}

export function SparklesIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="auto_awesome" className={className} />
}

export function DocumentIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="description" className={className} />
}

export function UserIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="person" className={className} />
}

export function ExclamationIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="error_outline" className={className} />
}

export function ChevronLeftIcon({ className = "text-2xl" }: IconProps) {
  return <MaterialIcon name="chevron_left" className={className} />
}
