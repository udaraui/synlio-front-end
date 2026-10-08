import { Ticket, Clock } from "lucide-react";
import Image from "next/image";
import Logo from "../../public/logo.png";

export default function RegistrationMarketing() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-1/2 p-8 xl:p-12 bg-gradient-to-br from-slate-50 to-indigo-50/30 relative overflow-hidden select-none">
      {/* <div className="absolute top-8 right-12 gap-3 flex items-center z-50">
        <Image src={Logo} width={38} height={38} alt="Synlio" />
        <span className="text-3xl font-bold text-slate-800 tracking-widest">
          Synlio
        </span>
      </div> */}
      
      {/* Scaling Wrapper */}
      <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center animate-[float_8s_ease-in-out_infinite] scale-90 xl:scale-100">
        
        {/* Background Layer: The App Window (Blurred Ticket Table) */}
        <div className="group absolute inset-0 m-auto w-full max-w-[560px] h-[400px] bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/80 flex flex-col p-6 opacity-60 blur-[1px] z-0 transition-all duration-700 hover:opacity-100 hover:blur-none hover:z-30 cursor-pointer">
          {/* Table Header */}
          <div className="flex flex-row text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-6">
            <div className="w-1/2">TITLE</div>
            <div className="w-[15%]">STATUS</div>
            <div className="w-[20%]">SEVERITY</div>
            <div className="w-[15%] flex justify-end">ASSIGNEE</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {/* Row 1 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-0 w-6 h-6 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 border border-indigo-100 text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                </div>

                <div className="w-full h-3 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-9 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 truncate pr-4">
                  Update onboarding flow copy
                </div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 left-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded-full text-[9px] font-bold">OPEN</span>
                </div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 group-hover:opacity-0 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-medium text-slate-600">High</span>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 right-0 w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 text-[8px] font-bold text-slate-500">
                  AS
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-0 w-6 h-6 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 border border-indigo-100 text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                </div>

                <div className="w-4/5 h-3 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-9 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 truncate pr-4">
                  Fix navigation bar on mobile
                </div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 left-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full text-[9px] font-bold">PROGRESS</span>
                </div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 group-hover:opacity-0 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  <span className="text-[10px] font-medium text-slate-600">Medium</span>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 right-0 w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 text-[8px] font-bold text-blue-500">
                  JD
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-0 w-6 h-6 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 border border-indigo-100 text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                </div>

                <div className="w-3/4 h-3 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-9 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 truncate pr-4">
                  Add billing portal layout
                </div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 left-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full text-[9px] font-bold">REVIEW</span>
                </div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 group-hover:opacity-0 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-medium text-slate-600">High</span>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 right-0 w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 text-[8px] font-bold text-slate-400">
                  MK
                </div>
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex items-center gap-4 mb-5 relative">
              <div className="w-1/2 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-200/50 flex-shrink-0 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-0 w-6 h-6 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 border border-indigo-100 text-indigo-400">
                  <Ticket className="w-3.5 h-3.5" />
                </div>

                <div className="w-5/6 h-3 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-9 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700 truncate pr-4">
                  Optimize hero image loading
                </div>
              </div>
              <div className="w-[15%] relative">
                <div className="w-12 h-4 rounded-full bg-blue-100/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 left-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold">DONE</span>
                </div>
              </div>
              <div className="w-[20%] flex items-center gap-2 relative">
                <div className="flex items-center gap-2 group-hover:opacity-0 transition-opacity duration-700 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200/50"></div>
                  <div className="w-10 h-2 rounded-full bg-slate-200/50"></div>
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  <span className="text-[10px] font-medium text-slate-500">Low</span>
                </div>
              </div>
              <div className="w-[15%] flex justify-end relative">
                <div className="w-7 h-7 rounded-full bg-slate-200/50 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute inset-y-0 right-0 w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 text-[8px] font-bold text-indigo-400">
                  RL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 1 (Resource Group) */}
        <div className="group absolute bottom-[10%] left-[-2%] w-[280px] bg-white rounded-2xl shadow-[0_25px_50px_rgb(0,0,0,0.12)] border-y border-r border-l-4 border-t-slate-100 border-b-slate-100 border-r-slate-100 border-l-blue-200 p-4 z-20 transition-transform duration-700 cursor-pointer">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 relative h-6">
            <div className="absolute inset-y-0 left-0 flex items-center w-24">
              <div className="w-full h-4 bg-slate-200 rounded-full group-hover:opacity-0 transition-opacity duration-700"></div>
              <h4 className="absolute text-sm font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                Engineering
              </h4>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-8">
              <div className="w-full h-4 bg-slate-100 border border-dashed border-slate-200 rounded-full group-hover:opacity-0 transition-opacity duration-700"></div>
              <div className="absolute inline-flex items-center border border-dashed border-slate-200 rounded-full px-2 py-0.5 text-[9px] font-bold text-slate-400 tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                HQ
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-4" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            {/* Owner Avatar */}
            <div className="flex items-center relative h-8">
              <div className="w-8 h-8 rounded-full bg-blue-50 shadow-sm border border-blue-100 group-hover:opacity-0 transition-opacity duration-700"></div>
              <div className="absolute left-0 w-8 h-8 rounded-full bg-blue-50/50 flex items-center justify-center text-blue-400 text-xs font-bold shadow-sm border border-blue-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                JD
              </div>
              
              <div className="flex flex-col justify-center h-8 relative ml-2 w-20">
                <div className="w-12 h-2 bg-slate-200 rounded-full mb-1 group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="w-8 h-1.5 bg-slate-100 rounded-full group-hover:opacity-0 transition-opacity duration-700"></div>
                <div className="absolute left-0 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">John Doe</span>
                  <span className="text-[8px] text-slate-400 whitespace-nowrap">Lead Engineer</span>
                </div>
              </div>
            </div>

            {/* Team Avatars */}
            <div className="flex items-center relative h-7 w-20">
              <div className="absolute right-0 flex items-center group-hover:opacity-0 transition-opacity duration-700">
                <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white z-30"></div>
                <div className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white -ml-2 z-20"></div>
                <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white -ml-2 z-10"></div>
                <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white -ml-2 z-0"></div>
              </div>
              <div className="absolute right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white z-30 flex items-center justify-center text-[8px] text-slate-500 font-bold">AS</div>
                <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white -ml-2 z-20 flex items-center justify-center text-[8px] text-slate-400 font-bold">MK</div>
                <div className="w-7 h-7 rounded-full bg-blue-50 border-2 border-white -ml-2 z-10 flex items-center justify-center text-[8px] text-blue-400 font-bold">RL</div>
                <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-white -ml-2 flex items-center justify-center z-0">
                  <span className="text-[9px] text-slate-400 font-bold">+8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: Card 2 (Missing Time) */}
        <div className="group absolute top-[10%] right-[-2%] w-[220px] bg-white rounded-2xl shadow-[0_25px_50px_rgb(0,0,0,0.12)] border border-slate-100 p-5 z-20 transition-transform duration-700 cursor-pointer">
          <div className="flex justify-between items-center mb-4 relative h-5">
            <div className="absolute left-0 flex items-center w-20">
              <div className="w-full h-3.5 bg-slate-200 rounded-full group-hover:opacity-0 transition-opacity duration-700"></div>
              <span className="absolute text-[11px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-700">Missing Time</span>
            </div>
            <div className="absolute right-0 flex items-center justify-end w-5">
              <div className="w-5 h-5 bg-amber-100 rounded-full group-hover:opacity-0 transition-opacity duration-700"></div>
              <Clock className="absolute w-4 h-4 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          </div>
          
          <div className="relative mb-4 h-10 w-24">
            <div className="absolute inset-0 bg-amber-100/50 rounded-lg group-hover:opacity-0 transition-opacity duration-700"></div>
            <div className="absolute inset-0 text-3xl font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-700 tracking-tight flex items-center">20.6h</div>
          </div>
          
          <div className="relative h-7 w-full">
            <div className="absolute left-0 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-full border border-amber-100/50 group-hover:opacity-0 transition-opacity duration-700">
              <div className="w-2 h-2 rounded-full bg-amber-200"></div>
              <div className="w-16 h-2 bg-amber-200/50 rounded-full"></div>
            </div>
            <div className="absolute left-0 flex items-center gap-1.5 text-[10px] font-medium text-amber-500 bg-amber-50/50 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 whitespace-nowrap border border-transparent">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Expected 40h
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
