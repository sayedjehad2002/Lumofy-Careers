import { motion } from "framer-motion";

const TeamPhoto = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Our <span className="text-gradient dark:neon-text">Team</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The people behind the platform — united by a shared mission.
          </p>
        </motion.div>

        <motion.div
          className="relative rounded-3xl overflow-hidden border border-border/50 shadow-xl shadow-primary/5 group"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="aspect-[16/9] bg-muted flex items-center justify-center">
            <img
              src="/placeholder.svg"
              alt="Lumofy team photo"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
          {/* Subtle bottom gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-foreground/20 to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
};

export default TeamPhoto;
