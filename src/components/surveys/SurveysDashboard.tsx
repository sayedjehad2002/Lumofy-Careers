import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Copy, Eye, Pencil, Trash2, BarChart3, ExternalLink, ClipboardList, FileText, Users, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Survey, SurveyStatus } from "@/types/surveys";
import { SURVEY_STATUSES, SURVEY_CATEGORIES } from "@/types/surveys";
import { toast } from "sonner";

interface Props {
  surveys: Survey[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateNew: () => void;
  onViewResponses: (id: string) => void;
  onViewAnalytics: (id: string) => void;
  onGenerateWithAI?: () => void;
}

const SurveysDashboard = ({ surveys, loading, onEdit, onDelete, onStatusChange, onCreateNew, onViewResponses, onViewAnalytics, onGenerateWithAI }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = surveys.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
  const activeSurveys = surveys.filter((s) => s.status === "published").length;

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/survey/${id}/respond`;
    navigator.clipboard.writeText(url);
    toast.success("Survey link copied!");
  };

  const stats = [
    { label: "Total Surveys", value: surveys.length, icon: ClipboardList, color: "text-primary" },
    { label: "Active Surveys", value: activeSurveys, icon: FileText, color: "text-emerald-400" },
    { label: "Total Responses", value: totalResponses, icon: Users, color: "text-purple-400" },
    { label: "Avg. Completion", value: totalResponses > 0 ? "—" : "—", icon: TrendingUp, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search surveys..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SURVEY_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {onGenerateWithAI && (
            <Button variant="outline" onClick={onGenerateWithAI} className="border-primary/30 text-primary hover:bg-primary/10">
              <Sparkles className="w-4 h-4 mr-1" /> Generate with AI
            </Button>
          )}
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1" /> Create Survey
          </Button>
        </div>
      </div>

      {/* Survey List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading surveys...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-1">No surveys yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first survey to start collecting feedback</p>
            <Button onClick={onCreateNew}><Plus className="w-4 h-4 mr-1" /> Create Survey</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((survey, i) => {
            const statusDef = SURVEY_STATUSES.find((s) => s.value === survey.status);
            const catDef = SURVEY_CATEGORIES.find((c) => c.value === survey.category);
            return (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{survey.title}</h3>
                          <Badge variant="outline" className={statusDef?.color || ""}>{statusDef?.label}</Badge>
                          {catDef && <Badge variant="secondary" className="text-xs">{catDef.label}</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{survey.response_count || 0} responses</span>
                          <span>{survey.is_anonymous ? "Anonymous" : "Named"}</span>
                          <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {survey.status === "published" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => copyLink(survey.id)} title="Copy link">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => window.open(`/survey/${survey.id}/respond`, '_blank')} title="Open survey">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onViewResponses(survey.id)} title="View responses">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onViewAnalytics(survey.id)} title="Analytics">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(survey.id)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(survey.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        {survey.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => onStatusChange(survey.id, "published")}>Publish</Button>
                        )}
                        {survey.status === "published" && (
                          <Button size="sm" variant="outline" onClick={() => onStatusChange(survey.id, "closed")}>Close</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SurveysDashboard;
