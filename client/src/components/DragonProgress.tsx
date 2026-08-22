import { Card } from "@/components/ui/card";
import { Crown, Sparkles } from "lucide-react";

const LEVEL_SIZE = 100_000;
const MAX_LEVEL = 100;

function imageForLevel(level: number) {
  if (level >= 76) return '/dragon-level-20.jpg';
  if (level >= 51) return '/dragon-level-15.jpg';
  if (level >= 26) return '/dragon-level-10.jpg';
  if (level >= 11) return '/dragon-level-5.jpg';
  return '/dragon-level-0.jpg';
}

function titleForLevel(level: number) {
  if (level >= 100) return 'HA-RATE Apex Dragon';
  if (level >= 76) return 'Ancient Dragon';
  if (level >= 51) return 'Elder Wyrm';
  if (level >= 26) return 'Storm Drake';
  if (level >= 11) return 'Young Dragon';
  if (level >= 1) return 'Baby Dragon';
  return 'Hatchling';
}

function dragonScale(level: number) {
  if (level <= 10) return 0.72 + (level / 10) * 0.10;
  if (level <= 25) return 0.84 + ((level - 10) / 15) * 0.08;
  if (level <= 50) return 0.92 + ((level - 25) / 25) * 0.08;
  if (level <= 75) return 1.00 + ((level - 50) / 25) * 0.08;
  return 1.08 + ((level - 75) / 25) * 0.10;
}

export default function DragonProgress({ balance }: { balance: number }) {
  const level = Math.min(MAX_LEVEL, Math.floor(balance / LEVEL_SIZE));
  const levelStart = level * LEVEL_SIZE;
  const withinLevel = level === MAX_LEVEL ? LEVEL_SIZE : Math.max(0, balance - levelStart);
  const progress = level === MAX_LEVEL ? 100 : Math.min(100, (withinLevel / LEVEL_SIZE) * 100);
  const nextNeeded = level === MAX_LEVEL ? 0 : LEVEL_SIZE - withinLevel;

  return (
    <Card className="overflow-hidden border-purple-400/25 bg-[#150a22] shadow-[0_0_50px_rgba(147,51,234,0.12)]">
      <div className="grid lg:grid-cols-[1fr_430px]">
        <div className="p-6 md:p-8 bg-gradient-to-br from-[#190b2a] via-[#12091d] to-[#0b0711]">
          <div className="flex items-center gap-2 text-fuchsia-300 text-xs uppercase tracking-[0.22em] mb-3">
            <Sparkles className="w-4 h-4" /> Dragon evolution
          </div>
          <div className="flex items-end gap-3 mb-2">
            <h3 className="text-4xl font-black">Level {level}<span className="text-white/25"> / 100</span></h3>
            {level === 100 && <Crown className="w-7 h-7 text-fuchsia-300 mb-1" />}
          </div>
          <p className="text-purple-300 font-semibold mb-6">{titleForLevel(level)}</p>

          <div className="flex justify-between text-sm mb-2">
            <span>{balance.toLocaleString()} HA-RATE</span>
            <span>{level === 100 ? 'MAX LEVEL' : `${((level + 1) * LEVEL_SIZE).toLocaleString()} HA-RATE`}</span>
          </div>
          <div className="h-3 rounded-full bg-[#08050d] overflow-hidden border border-purple-400/15">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-700 via-purple-500 to-fuchsia-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-400 mt-3">
            {level === 100 ? 'Your dragon reached its strongest final form.' : `${Math.ceil(nextNeeded).toLocaleString()} HA-RATE until Level ${level + 1}`}
          </p>

          <div className="mt-6 rounded-xl border border-purple-400/20 bg-purple-500/8 p-4 text-sm text-slate-300">
            Every <strong className="text-white">100,000 HA-RATE</strong> grows your dragon by one level. Levels <strong className="text-white">1–10</strong> start tiny, and it keeps becoming larger and stronger until the final form at <strong className="text-white">Level 100</strong>.
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 text-center text-[10px] uppercase tracking-wide text-slate-500">
            <div>1–10<br/><span className="text-purple-300">Baby</span></div>
            <div>11–25<br/><span className="text-purple-300">Young</span></div>
            <div>26–50<br/><span className="text-purple-300">Drake</span></div>
            <div>51–75<br/><span className="text-purple-300">Elder</span></div>
            <div>76–100<br/><span className="text-fuchsia-300">Apex</span></div>
          </div>
        </div>

        <div className="relative min-h-[330px] bg-gradient-to-br from-[#2a0b46] via-[#12091d] to-[#07040b] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,132,252,0.25),transparent_58%)]" />
          <img
            src={imageForLevel(level)}
            alt={`HA-RATE dragon level ${level}`}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-100 transition-transform duration-700"
            style={{ transform: `scale(${dragonScale(level)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#100718] via-transparent to-purple-950/20" />
          <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">current dragon</div>
              <div className="font-bold text-xl">{titleForLevel(level)}</div>
            </div>
            <div className="text-6xl font-black text-white/10">{String(level).padStart(2,'0')}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
