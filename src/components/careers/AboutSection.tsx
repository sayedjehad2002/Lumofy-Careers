import { motion } from "framer-motion";
import { Building2, Users, Lightbulb, Target, Globe, Rocket } from "lucide-react";

const AboutSection = () => {
  return (
    <>
      {/* About Lumofy */}
      <section id="about" className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          className="rounded-2xl bg-card border border-border p-8 md:p-10 glow-blue-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">About Lumofy</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Lumofy was founded in 2020 during the COVID-19 pandemic by Ahmed Faraj, later joined by Mahmood Malik, Safa Al Fulaij, and Mahmoud Elrweny. From the beginning, the founding team shared a clear belief: talent in the region deserves a better way to be recognized, developed, and empowered.
            </p>
            <p>
              Lumofy was founded in Bahrain. Lumofy is a pioneering EdTech company focused on elevating learning and capability-building for organizations worldwide. We bridge the gap between talent competencies and real opportunities by enabling competency-based learning experiences that make skills visible, measurable, and actionable.
            </p>
            <p>
              This approach helps organizations align people development with business priorities, close capability gaps, and create stronger outcomes at scale. Our focus is both practical and forward-looking: we support immediate organizational learning needs while continuously innovating to anticipate future workforce demands.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Who We Are */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <motion.div
          className="rounded-2xl bg-card border border-border p-8 md:p-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Who We Are?</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Lumofy is here to transform how organizations manage skilling and talent development. We are an AI-powered talent management platform that brings workforce skills into one unified solution, enabling companies to understand, develop, and optimize capabilities with clarity and confidence.
            </p>
            <p>
              By combining skills data, intelligent insights, and streamlined workflows, Lumofy helps leaders identify skill gaps, align development to business priorities, and make smarter workforce decisions.
            </p>
            <p>
              At our core, we focus on what growth truly means for each organization — by understanding its unique goals, challenges, and context, then translating that into actionable, measurable progress.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Purpose, Vision & Mission */}
      <section id="benefits" className="max-w-4xl mx-auto px-4 pb-20">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl font-bold">Purpose, Vision & Mission</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              emoji: "🧭",
              title: "Purpose",
              description: "To help people and organizations gain clarity on the skills needed for driving business impact, preparing for both future challenges and opportunities.",
              icon: Target,
            },
            {
              emoji: "🌍",
              title: "Vision",
              description: "We envision a world where skills are at the heart of every organization, enabling people with the right skills for the right opportunities to navigate change easily and drive continuous growth.",
              icon: Globe,
            },
            {
              emoji: "🚀",
              title: "Mission",
              description: "To empower people in developing the skills they need to build the future they want, our AI-powered skills intelligence platform provides strategic insights for individuals and organizations to thrive in a dynamic world.",
              icon: Rocket,
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl bg-card border border-border p-6 text-center glow-blue-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
};

export default AboutSection;
