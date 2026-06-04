import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CulturePerkCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const CulturePerkCard = ({ icon: Icon, title, desc }: CulturePerkCardProps) => {
  return (
    <motion.div
      className="glass-card rounded-2xl p-6 text-center dark:premium-card group"
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
    >
      {/* Gradient icon container */}
      <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
      </div>
      <h3 className="font-semibold text-sm mb-1 text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
};

export default CulturePerkCard;
