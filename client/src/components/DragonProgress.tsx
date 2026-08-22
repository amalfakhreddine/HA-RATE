import { Card } from "@/components/ui/card";
import { Crown, Sparkles } from "lucide-react";

const LEVEL_SIZE = 100_000;
const MAX_LEVEL = 20;

function imageForLevel(level: number) {
  if (level >= 20) return '/dragon-level-20.jpg';
  if (level >= 15) return '/dragon-level-15.jpg';
  if (level >= 10) return '/dragon-level-10.jpg';
  if (level >= 5) return '/dragon-level-5.jpg';
  return '/dragon-level-0.jpg';
}

function titleForLevel(level: number) {
  if (level === 20) return 'HA-RATE King';
  if (level >= 16) return 'Void Tyrant';
  if (level >= 11) return 'Dark Serpent';
  if (level >= 6) return 'Shadow Wyrm';
  if (level >= 1) return 'Tiny Draken';
  return 'The Hatchling';
}

export default function DragonProgress({ balance }: { balance: number }) {
  const level = Math.min(MAX_LEVEL, Math.floor(balance / LEVEL_SIZE));
  const levelStart = level * LEVEL_SIZE;
  const withinLevel = level === MAX_LEVEL ? LEVEL_SIZE : Math.max(0, balance - levelStart);
  const progress = level === MAX_LEVEL ? 100 : Math.min(100, (withinLevel / LEVEL_SIZE) * 100);
  const nextNeeded = level === MAX_LEVEL ? 0 : LEVEL_SIZE - withinLevel;

  return (
    <Card className="overflow-hidden border-purple-500/20 bg-[#0b0c12]">
      <div className="grid lg:grid-cols-[1fr_420px]">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-purple-300 text-xs uppercase tracking-[0.2em] mb-3"><Sparkles className="w-4 h-4" /> Dragon evolution</div>
          <div className="flex items-end gap-3 mb-2">
            <h3 className="text-4xl font-black">Level {level}</h3>
            {level === 20 && <Crown className="w-7 h-7 text-amber-300 mb-1" />}
          </div>
          <p className="text-purple-300 font-semibold mb-6">{titleForLevel(level)}</p>

          <div className="flex justify-between text-sm mb-2"><span>{balance.toLocaleString()} MIZ</span><span>{level === 20 ? 'MAX LEVEL' : `${((level + 1) * LEVEL_SIZE).toLocaleString()} MIZ`}</span></div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-sm text-slate-400 mt-3">{level === 20 ? 'Your dragon reached its final form.' : `${Math.ceil(nextNeeded).toLocaleString()} HA-RATE until Level ${level + 1}`}</p>
          <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm text-slate-300">
            Every <strong className="text-white">100,000 HA-RATE</strong> unlocks one new level. Level 20 is the maximum at <strong className="text-white">2,000,000 HA-RATE</strong>.
          </div>
        </div>
        <div className="relative min-h-[300px] bg-gradient-to-br from-purple-950/40 to-black overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_58%)]" />
          <img src={imageForLevel(level)} alt={`HA-RATE dragon level ${level}`} className="absolute inset-0 w-full h-full object-cover object-center opacity-95" style={{ transform: `scale(${1 + Math.min(level, 20) * 0.006})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c12] via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
            <div><div className="text-xs uppercase tracking-[0.2em] text-purple-300">current form</div><div className="font-bold text-xl">{titleForLevel(level)}</div></div>
            <div className="text-5xl font-black text-white/10">{String(level).padStart(2,'0')}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
