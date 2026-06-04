import { useState, useEffect, useMemo } from "react";
import { Search, BookOpen, Clock, Shield, Award, DollarSign, Briefcase, ChevronRight, ArrowLeft, Sparkles, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Policy {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  key_points: string[];
  related_policies: string[];
  status: string;
}

const CATEGORIES = [
  { id: "all", label: "All Policies", icon: <BookOpen className="w-4 h-4" />, color: "bg-primary/10 text-primary border-primary/20" },
  { id: "work", label: "Work Policies", icon: <Briefcase className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "leave", label: "Leave Policies", icon: <Clock className="w-4 h-4" />, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { id: "performance", label: "Performance", icon: <Award className="w-4 h-4" />, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { id: "compensation", label: "Compensation", icon: <DollarSign className="w-4 h-4" />, color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  { id: "recognition", label: "Recognition", icon: <Sparkles className="w-4 h-4" />, color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
  { id: "conduct", label: "Conduct", icon: <Shield className="w-4 h-4" />, color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];
}

export default function PoliciesTab({ onAskCopilot }: { onAskCopilot?: (prompt: string) => void }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .eq("status", "active")
        .order("category")
        .order("title");
      if (data) {
        setPolicies(data.map((p: any) => ({
          ...p,
          key_points: Array.isArray(p.key_points) ? p.key_points : [],
          related_policies: Array.isArray(p.related_policies) ? p.related_policies : [],
        })));
      }
      setLoading(false);
    };
    fetchPolicies();
  }, []);

  const filtered = useMemo(() => {
    let result = policies;
    if (activeCategory !== "all") result = result.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.key_points.some(kp => kp.toLowerCase().includes(q))
      );
    }
    return result;
  }, [policies, activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: policies.length };
    for (const p of policies) counts[p.category] = (counts[p.category] || 0) + 1;
    return counts;
  }, [policies]);

  if (selectedPolicy) {
    const catInfo = getCategoryInfo(selectedPolicy.category);
    const relatedPolicies = policies.filter(p => selectedPolicy.related_policies.includes(p.title));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)} className="h-8">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Badge className={`${catInfo.color} border`}>
            {catInfo.icon}
            <span className="ml-1">{catInfo.label}</span>
          </Badge>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border bg-secondary/20">
            <h1 className="text-xl font-bold mb-2">{selectedPolicy.title}</h1>
            <p className="text-sm text-muted-foreground">{selectedPolicy.summary}</p>
            {onAskCopilot && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-8 text-xs"
                onClick={() => onAskCopilot(`Explain the ${selectedPolicy.title} in detail. What are the key rules and conditions?`)}
              >
                <Sparkles className="w-3 h-3 mr-1" /> Ask Copilot about this policy
              </Button>
            )}
          </div>

          {/* Key Points */}
          {selectedPolicy.key_points.length > 0 && (
            <div className="p-6 border-b border-border bg-primary/5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Quick Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedPolicy.key_points.map((kp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                    <span>{kp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Content */}
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:mt-6 [&_h2]:mt-4 [&_h3]:mt-3 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-2">
              <ReactMarkdown>{selectedPolicy.content}</ReactMarkdown>
            </div>
          </div>

          {/* Related Policies */}
          {relatedPolicies.length > 0 && (
            <div className="p-6 border-t border-border bg-secondary/10">
              <h3 className="text-sm font-semibold mb-3">Related Policies</h3>
              <div className="flex flex-wrap gap-2">
                {relatedPolicies.map(rp => (
                  <button
                    key={rp.id}
                    onClick={() => setSelectedPolicy(rp)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border transition-colors"
                  >
                    {rp.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Lumofy Policy Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {policies.length} policies · Browse or ask Copilot any HR question
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === cat.id
                ? cat.color + " border-current"
                : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
            }`}
          >
            {cat.icon}
            {cat.label}
            <span className="opacity-60">({categoryCounts[cat.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Ask Copilot banner */}
      {onAskCopilot && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Ask Lumofy Copilot</p>
            <p className="text-xs text-muted-foreground">Ask any HR policy question in natural language</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["How many leave days do I get?", "What are the working hours?", "How are bonuses calculated?"].map(q => (
              <button
                key={q}
                onClick={() => onAskCopilot(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Policy cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No policies found</p>
          <p className="text-xs mt-1">Try a different search term or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(policy => {
            const catInfo = getCategoryInfo(policy.category);
            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(policy)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className={`${catInfo.color} border text-[10px] px-1.5 py-0 h-5`}>
                    {catInfo.icon}
                    <span className="ml-1">{catInfo.label}</span>
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 line-clamp-2">{policy.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{policy.summary}</p>
                <div className="space-y-1">
                  {policy.key_points.slice(0, 3).map((kp, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span className="line-clamp-1">{kp}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
