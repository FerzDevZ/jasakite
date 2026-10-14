# Bento Grid & Asymmetrical Layout Guide

## Standard Tailwind Bento Grid Pattern

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto p-6">
  {/* Large Hero Card (2 cols, 2 rows) */}
  <div className="md:col-span-2 md:row-span-2 rounded-3xl bg-zinc-900/60 border border-white/10 p-8 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <h3 className="text-2xl font-bold text-white tracking-tight">Main Feature</h3>
    <p className="text-zinc-400 mt-2">Deep architectural control with real-time feedback.</p>
  </div>

  {/* Medium Stat Card */}
  <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 backdrop-blur-xl">
    <span className="text-sm font-medium text-emerald-400">99.99%</span>
    <h4 className="text-lg font-semibold text-white mt-1">Uptime SLA</h4>
  </div>

  {/* Micro Interactive Card */}
  <div className="rounded-3xl bg-zinc-900/60 border border-white/10 p-6 backdrop-blur-xl flex items-center justify-center">
    <button className="px-5 py-2.5 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
      Get Started
    </button>
  </div>
</div>
```
