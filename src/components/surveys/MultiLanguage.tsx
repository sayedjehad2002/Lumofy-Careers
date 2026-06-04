import { useState } from "react";
import { Globe, Loader2, Plus, X, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "ar", label: "Arabic (العربية)" },
  { code: "fr", label: "French (Français)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "ja", label: "Japanese (日本語)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "ru", label: "Russian (Русский)" },
  { code: "ur", label: "Urdu (اردو)" },
];

interface TranslatedQuestion {
  original: string;
  translated: string;
}

interface Translation {
  language: string;
  title: string;
  description: string;
  questions: TranslatedQuestion[];
}

interface Props {
  title: string;
  description: string;
  questions: { question_text: string }[];
  translations: Translation[];
  onTranslationsChange: (translations: Translation[]) => void;
  sessionToken: string;
}

const MultiLanguage = ({ title, description, questions, translations, onTranslationsChange, sessionToken }: Props) => {
  const [translating, setTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");

  const addedLangs = translations.map(t => t.language);
  const availableLangs = LANGUAGES.filter(l => !addedLangs.includes(l.code));

  const handleTranslate = async () => {
    if (!selectedLang) return;
    const langDef = LANGUAGES.find(l => l.code === selectedLang);
    if (!langDef) return;

    setTranslating(true);
    try {
      const content = [
        `Title: ${title}`,
        `Description: ${description}`,
        ...questions.map((q, i) => `Q${i + 1}: ${q.question_text}`),
      ].join("\n");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-ai-improve`, {
        method: "POST",
        headers: {
          "x-session-token": sessionToken,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_text: content,
          question_type: "long_text",
          options: [],
          action: `translate_to_${selectedLang}`,
          custom_instruction: `Translate all the following survey content to ${langDef.label}. Return ONLY the translated text in the exact same format (Title:, Description:, Q1:, Q2:, etc). Maintain the numbering.`,
        }),
      });

      if (!res.ok) {
        toast.error("Translation failed");
        setTranslating(false);
        return;
      }

      const json = await res.json();
      const translatedText = json.improved_text || "";

      // Parse the response
      const lines = translatedText.split("\n").filter(Boolean);
      let tTitle = title;
      let tDesc = description;
      const tQuestions: TranslatedQuestion[] = [];

      lines.forEach((line: string) => {
        if (line.startsWith("Title:")) tTitle = line.replace("Title:", "").trim();
        else if (line.startsWith("Description:")) tDesc = line.replace("Description:", "").trim();
        else {
          const match = line.match(/^Q\d+:\s*(.+)/);
          if (match) {
            const idx = tQuestions.length;
            tQuestions.push({
              original: questions[idx]?.question_text || "",
              translated: match[1].trim(),
            });
          }
        }
      });

      // Fill in any missing translations
      while (tQuestions.length < questions.length) {
        tQuestions.push({
          original: questions[tQuestions.length].question_text,
          translated: questions[tQuestions.length].question_text,
        });
      }

      const newTranslation: Translation = {
        language: selectedLang,
        title: tTitle,
        description: tDesc,
        questions: tQuestions,
      };

      onTranslationsChange([...translations, newTranslation]);
      setSelectedLang("");
      toast.success(`Translated to ${langDef.label}`);
    } catch {
      toast.error("Translation failed");
    }
    setTranslating(false);
  };

  const removeTranslation = (lang: string) => {
    onTranslationsChange(translations.filter(t => t.language !== lang));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Multi-Language</span>
        {translations.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">{translations.length} languages</Badge>
        )}
      </div>

      {/* Add Language */}
      <div className="flex gap-2">
        <Select value={selectedLang} onValueChange={setSelectedLang}>
          <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="Select language to add" /></SelectTrigger>
          <SelectContent>
            {availableLangs.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleTranslate} disabled={!selectedLang || translating || questions.length === 0}>
          {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4 mr-1" />}
          Translate
        </Button>
      </div>

      {/* Existing Translations */}
      {translations.map(t => {
        const langDef = LANGUAGES.find(l => l.code === t.language);
        return (
          <Card key={t.language} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{langDef?.label || t.language}</Badge>
                  <span className="text-xs text-muted-foreground">{t.questions.length} questions translated</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTranslation(t.language)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-xs"><span className="text-muted-foreground">Title:</span> {t.title}</p>
                {t.questions.slice(0, 2).map((q, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground truncate">Q{i + 1}: {q.translated}</p>
                ))}
                {t.questions.length > 2 && (
                  <p className="text-[10px] text-muted-foreground">+{t.questions.length - 2} more</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {translations.length === 0 && (
        <p className="text-xs text-muted-foreground">No translations added. Select a language above and click Translate to create AI-powered translations.</p>
      )}
    </div>
  );
};

export default MultiLanguage;
