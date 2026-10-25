export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_30%,transparent_100%)]" />
      <div className="absolute top-[-320px] left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.12),transparent)]" />
      <div className="iris-ring absolute top-[120px] left-[78%] hidden size-[520px] rounded-full border border-white/[0.04] lg:block [mask-image:linear-gradient(to_bottom,#000,transparent)]">
        <div className="absolute inset-12 rounded-full border border-dashed border-white/[0.05]" />
        <div className="absolute inset-28 rounded-full border border-signal/10" />
        <div className="absolute inset-[42%] rounded-full bg-signal/20 blur-xl" />
      </div>
    </div>
  )
}
