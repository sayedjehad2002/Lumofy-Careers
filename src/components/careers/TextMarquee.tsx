import { motion } from "framer-motion";

const phrases = [
  "AI-Powered",
  "HRTech",
  "Innovation",
  "Growth",
  "Talent Intelligence",
  "Skills Mapping",
  "Enterprise",
  "Future of Work",
  "MENA",
  "Workforce Analytics",
];

const TextMarquee = () => {
  const doubled = [...phrases, ...phrases];

  return (
    <div className="relative py-8 overflow-hidden border-y border-border/30">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((phrase, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className="text-sm sm:text-base font-medium text-muted-foreground/50 uppercase tracking-[0.2em]">
              {phrase}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          </span>
        ))}
      </motion.div>
    </div>
  );
};

export default TextMarquee;
