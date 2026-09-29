import { Droplet, Heart, Activity } from 'lucide-react';

export function Logo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const dimensions = {
    small: { outer: 40, inner: 22, text: 'text-lg', tagline: 'text-[9px]' },
    default: { outer: 56, inner: 30, text: 'text-2xl', tagline: 'text-[10px]' },
    large: { outer: 72, inner: 38, text: 'text-4xl', tagline: 'text-xs' }
  };

  const { outer, inner, text, tagline } = dimensions[size];

  return (
    <div className="flex items-center gap-3">
      <div className="relative group">
        <div
          className="rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-red-700 flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-105 relative overflow-hidden"
          style={{ width: outer, height: outer }}
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <Droplet
            size={inner}
            className="text-white fill-current relative z-10 drop-shadow-lg"
            strokeWidth={2.5}
          />
          <Activity
            size={inner * 0.4}
            className="absolute text-white/30 animate-pulse"
            strokeWidth={3}
          />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-red-600 to-rose-700 rounded-full p-1.5 shadow-lg border-2 border-white">
          <Heart
            size={inner * 0.45}
            className="text-white fill-current"
            strokeWidth={2.5}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`${text} font-black tracking-tight leading-none`}>
          <span className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 bg-clip-text text-transparent">
            Blood
          </span>
          <span className="bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
            Connect
          </span>
        </span>
        <span className={`${tagline} text-gray-600 font-bold tracking-widest uppercase mt-0.5 bg-red-50 px-2 py-0.5 rounded-full inline-block`}>
          Connecting Lives
        </span>
      </div>
    </div>
  );
}
