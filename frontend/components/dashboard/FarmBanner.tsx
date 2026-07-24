import Image from "next/image";

export default function FarmBanner() {
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-green-50 via-white to-emerald-50 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">

      {/* Decorative Background */}
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-green-200/20 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-200/20 blur-3xl" />

      {/* Image */}
      <div className="relative flex h-full min-h-[300px] items-center justify-center p-6">

        <div className="relative h-full w-full overflow-hidden rounded-2xl">

          <Image
  src="/images/farm-hero.png"
  alt="Farm"
  fill
  className="object-right object-cover rounded-2xl transition-transform duration-700 group-hover:scale-105"
/>

        </div>

      </div>

    </div>
  );
}