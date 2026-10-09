import Image from "next/image";
import Logo from "../../public/logo.png";

export default function RegistrationMarketing() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-1/2 p-8 xl:p-12 bg-neutral-50 dark:bg-neutral-950 relative overflow-hidden select-none">

      {/* Brand Header */}
      {/* <div className="absolute top-28 flex items-center gap-2">
        <Image src={Logo} width={32} height={32} alt="synlio" />
        <span className="text-2xl font-bold text-gray-900 dark:text-foreground tracking-widest">
          Synlio
        </span>
      </div> */}
      {/* Scaling Wrapper */}
      <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center animate-[float_8s_ease-in-out_infinite] scale-90 xl:scale-100">

        {/* Background Layer: The App Window (Blurred Ticket Table) */}
        <div className="group absolute inset-0 m-auto w-full max-w-[560px] h-[400px] bg-slate-300/40 dark:bg-white/10 backdrop-blur-sm rounded-md shadow-md border border-white/60 dark:border-white/10 flex flex-col p-6 opacity-80 hover:opacity-100 blur-[1px] hover:blur-none z-0 transition-all duration-700 hover:z-30 cursor-pointer">
          {/* Table Header */}
          <div className="flex flex-row mb-6 items-center">
            <div className="w-1/2 flex items-center gap-2 opacity-80">
              <Image src={Logo} width={20} height={20} alt="synlio" />
              <span className="text-lg font-bold text-slate-800 dark:text-white/90 tracking-widest">
                Synlio
              </span>
            </div>
            <div className="w-[15%]">
              <div className="w-10 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
            </div>
            <div className="w-[20%]">
              <div className="w-12 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
            </div>
            <div className="w-[15%] flex justify-end">
              <div className="w-12 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {/* Row 1 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-400/50 dark:bg-white/10 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-full h-3 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-300/50 dark:bg-blue-400/20 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-400/50 dark:bg-white/10 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-4/5 h-3 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-300/50 dark:bg-blue-400/20 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-400/50 dark:bg-white/10 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-3/4 h-3 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-300/50 dark:bg-blue-400/20 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-400/50 dark:bg-white/10 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-5/6 h-3 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-300/50 dark:bg-blue-400/20 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-400/50 dark:bg-white/10"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-400/50 dark:bg-white/10 transition-opacity duration-700"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 1 (Resource Group) */}
        <div className="group absolute bottom-[10%] left-[-2%] w-[280px] bg-slate-200/50 dark:bg-white/10 backdrop-blur-md rounded-md shadow-md border border-white/60 dark:border-white/10 p-4 z-20 transition-transform duration-700 cursor-pointer">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 relative h-6">
            <div className="absolute inset-y-0 left-0 flex items-center w-24">
              <div className="w-full h-4 bg-slate-300 dark:bg-white/20 rounded-full transition-opacity duration-700"></div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-8">
              <div className="w-full h-4 bg-slate-200 dark:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 rounded-full transition-opacity duration-700"></div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-300 dark:border-white/10 my-4" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            {/* Owner Avatar */}
            <div className="flex items-center relative h-8">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-400/10 transition-opacity duration-700"></div>

              <div className="flex flex-col justify-center h-8 relative ml-2 w-20">
                <div className="w-12 h-2 bg-slate-300 dark:bg-white/20 rounded-full mb-1 transition-opacity duration-700"></div>
                <div className="w-8 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Team Avatars */}
            <div className="flex items-center relative h-7 w-20">
              <div className="absolute right-0 flex items-center transition-opacity duration-700">
                <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-white/20 z-30"></div>
                <div className="w-7 h-7 rounded-full bg-indigo-200 dark:bg-indigo-400/20 -ml-2 z-20"></div>
                <div className="w-7 h-7 rounded-full bg-blue-200 dark:bg-blue-400/20 -ml-2 z-10"></div>
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/5 -ml-2 z-0"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 2 (Ticket Space) */}
        <div className="group absolute top-[10%] right-[-5%] w-[300px] bg-slate-200/50 dark:bg-white/10 backdrop-blur-md rounded-md shadow-md border border-white/60 dark:border-white/10 p-4 z-20 transition-transform duration-700 cursor-pointer">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 relative h-6 mb-2">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center w-32">
              <div className="w-full h-4 bg-slate-300 dark:bg-white/20 rounded-full transition-opacity duration-700"></div>
              <div className="w-24 h-2 bg-slate-200 dark:bg-white/10 rounded-full mt-1.5 transition-opacity duration-700"></div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-10">
              <div className="w-full h-5 bg-slate-200 dark:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 rounded-md transition-opacity duration-700"></div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-300 dark:border-white/10 my-4" />

          {/* Tickets Section */}
          <div className="relative h-4 mb-1">
            <div className="absolute left-0 flex items-center w-12">
              <div className="w-full h-2.5 bg-slate-300 dark:bg-white/20 rounded-full transition-opacity duration-700"></div>
            </div>
          </div>
          {/* Pills */}
          <div className="flex gap-2 mb-2">
            <div className="flex items-center justify-center w-14 h-5 rounded-md bg-slate-200 dark:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 transition-opacity duration-700">
              {/* <div className="w-6 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div> */}
            </div>
            <div className="flex items-center justify-center w-16 h-5 rounded-md bg-slate-200 dark:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 transition-opacity duration-700">
              {/* <div className="w-8 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div> */}
            </div>
            <div className="flex items-center justify-center w-20 h-5 rounded-md bg-slate-200 dark:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 transition-opacity duration-700">
              {/* <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div> */}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between relative h-7">
            <div className="absolute inset-y-0 left-0 flex items-center w-[120px]">
              <div className="w-full h-full bg-slate-300 dark:bg-white/10 rounded-md transition-opacity duration-700"></div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-md bg-slate-300 dark:bg-white/20 transition-opacity duration-700"></div>
              <div className="w-7 h-7 rounded-md bg-indigo-200 dark:bg-indigo-400/20 transition-opacity duration-700"></div>
              <div className="w-7 h-7 rounded-md bg-blue-200 dark:bg-blue-400/20 transition-opacity duration-700"></div>
              <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-white/5 transition-opacity duration-700"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
