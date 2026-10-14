/**
 * Transisi antar-rute. Dulu memakai framer-motion hanya untuk fade+slide 10px
 * ini — satu library animasi penuh untuk satu efek. Sekarang dipakai keyframe
 * Tailwind `fade-up` yang sudah ada, sehingga template ini tetap Server
 * Component dan framer-motion bisa dilepas dari bundle.
 *
 * `motion-reduce:animate-none` menghormati preferensi pengguna.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-up motion-reduce:animate-none">{children}</div>
  )
}
