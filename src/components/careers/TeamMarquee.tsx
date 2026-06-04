import { MapPin } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";

interface TeamMember {
  name: string;
  role: string;
  department: string;
  location: string;
  avatar: string;
  photo: string;
  bio: string;
}

interface TeamMarqueeProps {
  members: TeamMember[];
}

const TeamMarquee = ({ members }: TeamMarqueeProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const speed = 0.15; // pixels per ms frame

  const duplicated = [...members, ...members, ...members];
  const cardWidth = 280 + 24; // card width + gap
  const resetPoint = members.length * cardWidth;

  const tick = useCallback((timestamp: number) => {
    if (!trackRef.current) return;

    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp;
    }

    if (!isPaused) {
      const delta = timestamp - lastTimeRef.current;
      offsetRef.current -= speed * delta;

      if (Math.abs(offsetRef.current) >= resetPoint) {
        offsetRef.current += resetPoint;
      }

      trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
    }

    lastTimeRef.current = timestamp;
    animRef.current = requestAnimationFrame(tick);
  }, [isPaused, resetPoint]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [tick]);

  return (
    <div
      className="relative w-full overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      <div
        ref={trackRef}
        className="flex gap-6 w-max will-change-transform"
      >
        {duplicated.map((member, i) => (
          <div
            key={`${member.name}-${i}`}
            className="glass-card dark:premium-card rounded-2xl p-6 text-center group flex-shrink-0 w-[280px] hover:-translate-y-2 transition-transform duration-250"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 mx-auto mb-4 group-hover:border-primary/50 transition-colors duration-300 shadow-lg shadow-primary/10">
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <h3 className="font-semibold text-base mb-0.5 text-foreground">{member.name}</h3>
            <p className="text-xs text-primary font-medium mb-2">{member.role}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{member.bio}</p>

            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="text-[11px]">{member.location}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">
          paused
        </div>
      )}
    </div>
  );
};

export default TeamMarquee;
