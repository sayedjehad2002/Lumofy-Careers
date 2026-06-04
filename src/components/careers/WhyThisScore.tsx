import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Target, Wrench, Briefcase, Building2, GraduationCap, HeartPulse, Gauge, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AIScoreBreakdown, AIScoringWeights } from "@/types/careers";
import { DEFAULT_AI_WEIGHTS } from "@/types/careers";

interface WhyThisScoreProps {
  scoreBreakdown: AIScoreBreakdown;
  fitScore: number;
  weights?: AIScoringWeights;
}

const DIMENSIONS = [
  { key: "skillsMatch" as const, weightKey: "skills" as const, label: "Skills", icon: Target, color: "hsl(217, 91%, 60%)", tooltip: "How well the candidate's skills match job requirements" },
  { key: "toolsMatch" as const, weightKey: "tools" as const, label: "Tools", icon: Wrench, color: "hsl(271, 91%, 65%)", tooltip: "Coverage of required tools, frameworks, and technologies" },
  { key: "relevantExperience" as const, weightKey: "experience" as const, label: "Experience", icon: Briefcase, color: "hsl(152, 69%, 40%)", tooltip: "Years and quality of relevant work experience" },
  { key: "industryAlignment" as const, weightKey: "industry" as const, label: "Industry", icon: Building2, color: "hsl(45, 93%, 47%)", tooltip: "Relevance of past industries to the target role" },
  { key: "educationRelevance" as const, weightKey: "education" as const, label: "Education", icon: GraduationCap, color: "hsl(340, 82%, 52%)", tooltip: "How well education aligns with requirements" },
  { key: "careerStability" as const, weightKey: "stability" as const, label: "Stability", icon: HeartPulse, color: "hsl(190, 80%, 45%)", tooltip: "Consistency of career progression and tenure" },
];

/* SVG radial gauge */
function RadialGauge({ value, color, size = 80, strokeWidth = 7, delay = 0 }: {
  value: number; color: string; size?: number; strokeWidth?: number; delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        {/* Animated foreground */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {/* Center number */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.3 }}
      >
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </motion.div>
    </div>
  );
}

/* Contribution bar — shows how many points this dimension adds to the total */
function ContributionBar({ score, weight, color, delay }: {
  score: number; weight: number; color: string; delay: number;
}) {
  const contribution = Math.round((score * weight) / 100);
  const maxContribution = weight; // max possible points from this dimension

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(contribution / maxContribution) * 100}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
        +{contribution}
      </span>
    </div>
  );
}

const WhyThisScore = ({ scoreBreakdown, fitScore, weights }: WhyThisScoreProps) => {
  const [expanded, setExpanded] = useState(false);
  const w = weights || DEFAULT_AI_WEIGHTS;

  // Calculate weighted contributions
  const contributions = DIMENSIONS.map((dim) => {
    const score = scoreBreakdown[dim.key] ?? 0;
    const weight = w[dim.weightKey];
    return {
      ...dim,
      score,
      weight,
      contribution: Math.round((score * weight) / 100),
    };
  });

  const calculatedTotal = contributions.reduce((sum, c) => sum + c.contribution, 0);

  return (
    <TooltipProvider>
      <motion.div
        className="rounded-xl border border-border bg-card overflow-hidden"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Gauge className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Why This Score?
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Shows how each dimension contributes to the overall weighted score. Weights are configured per job.</p>
                  </TooltipContent>
                </Tooltip>
              </h3>
              <p className="text-xs text-muted-foreground">
                {fitScore} points from {contributions.filter(c => c.score > 0).length} dimensions
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-5">
                {/* Radial gauges row */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {contributions.map((dim, i) => (
                    <Tooltip key={dim.key}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-help"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <RadialGauge
                            value={dim.score}
                            color={dim.color}
                            size={68}
                            strokeWidth={6}
                            delay={i * 0.1}
                          />
                          <div className="flex items-center gap-1">
                            <dim.icon className="w-3 h-3" style={{ color: dim.color }} />
                            <span className="text-[10px] text-muted-foreground font-medium">{dim.label}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground/60">{dim.weight}% weight</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs font-medium mb-1">{dim.label}: {dim.score}/100</p>
                        <p className="text-xs text-muted-foreground">{dim.tooltip}</p>
                        <p className="text-xs text-muted-foreground mt-1">Contributes +{dim.contribution} points ({dim.weight}% × {dim.score})</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Contribution breakdown */}
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Point Contributions</p>
                  {contributions.map((dim, i) => (
                    <motion.div
                      key={dim.key}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dim.color }} />
                        <span className="text-xs text-muted-foreground truncate">{dim.label}</span>
                      </div>
                      <ContributionBar
                        score={dim.score}
                        weight={dim.weight}
                        color={dim.color}
                        delay={0.3 + i * 0.05}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Formula footer */}
                <motion.div
                  className="flex items-center justify-between pt-3 border-t border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <p className="text-[10px] text-muted-foreground">
                    Weighted formula: Σ(dimension × weight%)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Calculated:</span>
                    <span className="text-sm font-bold text-primary">{calculatedTotal}</span>
                    {calculatedTotal !== fitScore && (
                      <span className="text-[10px] text-muted-foreground">(AI: {fitScore})</span>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
};

export default WhyThisScore;
