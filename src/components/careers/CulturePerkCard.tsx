import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CulturePerkCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const CulturePerkCard = ({ icon: Icon, title, desc }: CulturePerkCardProps) => {
  return (
    <motion.div
      className="h-full rounded-2xl border border-border bg-card p-6 text-center light-glow transition-transform duration-300 hover:-translate-y-1"
      variants={fadeUp}
    >
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mb-1 text-sm font-bold text-foreground">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </motion.div>
  );
};

export default CulturePerkCard;
