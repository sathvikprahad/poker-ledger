import { useState } from 'react'

const COLORS = [
  'bg-green-700', 'bg-blue-700', 'bg-purple-700',
  'bg-yellow-600', 'bg-red-700', 'bg-pink-700',
  'bg-cyan-700', 'bg-orange-700',
]

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-xl',
}

export default function Avatar({ player, size = 'md' }) {
  const [imgError, setImgError] = useState(false)

  const initials = player.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const color = COLORS[player.name.charCodeAt(0) % COLORS.length]
  const sizeClass = SIZES[size] || SIZES.md

  if (player.avatar_url && !imgError) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center
                  font-bold text-white flex-shrink-0 select-none`}
    >
      {initials}
    </div>
  )
}
