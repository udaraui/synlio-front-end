import Image from "next/image";
import Logo from "../../public/logo.png";

export default function RegistrationMarketing() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-1/2 p-8 xl:p-12 bg-gradient-to-br from-slate-50 to-indigo-50/30 relative overflow-hidden select-none">
      
      {/* Brand Header */}
      {/* <div className="absolute top-28 flex items-center gap-2">
        <Image src={Logo} width={32} height={32} alt="synlio" />
        <span className="text-2xl font-bold text-gray-900 tracking-widest">
          Synlio
        </span>
      </div> */}
      {/* Scaling Wrapper */}
      <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center animate-[float_8s_ease-in-out_infinite] scale-90 xl:scale-100">
        
        {/* Background Layer: The App Window (Blurred Ticket Table) */}
        <div className="group absolute inset-0 m-auto w-full max-w-[560px] h-[400px] bg-white/60 backdrop-blur-sm rounded-md shadow-md border border-white/80 flex flex-col p-6 opacity-60 blur-[1px] z-0 transition-all duration-700 hover:opacity-100 hover:blur-none hover:z-30 cursor-pointer">
          {/* Table Header */}
          <div className="flex flex-row mb-6">
            <div className="w-1/2">
              <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
            </div>
            <div className="w-[15%]">
              <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
            </div>
            <div className="w-[20%]">
              <div className="w-12 h-2 rounded-full bg-slate-200/50"></div>
            </div>
            <div className="w-[15%] flex justify-end">
              <div className="w-12 h-2 rounded-full bg-slate-200/50"></div>
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {/* Row 1 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-full h-3 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-4/5 h-3 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-3/4 h-3 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 transition-opacity duration-700"></div>
                <div className="w-5/6 h-3 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 transition-opacity duration-700"></div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 transition-opacity duration-700"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 1 (Resource Group) */}
        <div className="group absolute bottom-[10%] left-[-2%] w-[280px] bg-white rounded-md shadow-md border-y border-r border-l-2 border-t-slate-100 border-b-slate-100 border-r-slate-100 border-l-blue-200 p-4 z-20 transition-transform duration-700 cursor-pointer">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 relative h-6">
            <div className="absolute inset-y-0 left-0 flex items-center w-24">
              <div className="w-full h-4 bg-slate-200 rounded-full transition-opacity duration-700"></div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-8">
              <div className="w-full h-4 bg-slate-100 border border-dashed border-slate-200 rounded-full transition-opacity duration-700"></div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-4" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            {/* Owner Avatar */}
            <div className="flex items-center relative h-8">
              <div className="w-8 h-8 rounded-full bg-blue-50 transition-opacity duration-700"></div>
              
              <div className="flex flex-col justify-center h-8 relative ml-2 w-20">
                <div className="w-12 h-2 bg-slate-200 rounded-full mb-1 transition-opacity duration-700"></div>
                <div className="w-8 h-1.5 bg-slate-100 rounded-full transition-opacity duration-700"></div>
              </div>
            </div>

            {/* Team Avatars */}
            <div className="flex items-center relative h-7 w-20">
              <div className="absolute right-0 flex items-center transition-opacity duration-700">
                <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white z-30"></div>
                <div className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white -ml-2 z-20"></div>
                <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white -ml-2 z-10"></div>
                <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white -ml-2 z-0"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 2 (Missing Time) */}
        <div className="group absolute top-[10%] right-[-2%] w-[220px] bg-white rounded-md shadow-md border border-slate-100 p-5 z-20 transition-transform duration-700 cursor-pointer">
          <div className="flex justify-between items-center mb-4 relative h-5">
            <div className="absolute left-0 flex items-center w-20">
              <div className="w-full h-3.5 bg-slate-200 rounded-full transition-opacity duration-700"></div>
            </div>
            <div className="absolute right-0 flex items-center justify-end w-5">
              <div className="w-5 h-5 bg-amber-100 rounded-full transition-opacity duration-700"></div>
            </div>
          </div>
          
          <div className="relative mb-4 h-10 w-24">
            <div className="absolute inset-0 bg-amber-100/50 rounded-lg transition-opacity duration-700"></div>
          </div>
          
          <div className="relative h-7 w-full">
            <div className="absolute left-0 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-full border border-amber-100/50 transition-opacity duration-700">
              <div className="w-2 h-2 rounded-full bg-amber-200"></div>
              <div className="w-16 h-2 bg-amber-200/50 rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
