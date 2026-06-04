import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, ExternalLink, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Survey } from "@/types/surveys";

interface Props {
  surveys: Survey[];
}

const SIZES = [
  { value: "128", label: "Small (128px)" },
  { value: "256", label: "Medium (256px)" },
  { value: "512", label: "Large (512px)" },
];

const COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#1e40af", label: "Blue" },
  { value: "#059669", label: "Green" },
  { value: "#7c3aed", label: "Purple" },
  { value: "#dc2626", label: "Red" },
];

const QRCodeGenerator = ({ surveys }: Props) => {
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [size, setSize] = useState("256");
  const [fgColor, setFgColor] = useState("#000000");
  const [includeTitle, setIncludeTitle] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
  const surveyUrl = selectedSurveyId ? `${window.location.origin}/survey/${selectedSurveyId}/respond` : "";

  const handleCopyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    toast.success("Survey link copied!");
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const sizeNum = parseInt(size);
    const padding = 40;
    const titleHeight = includeTitle && selectedSurvey ? 40 : 0;
    canvas.width = sizeNum + padding * 2;
    canvas.height = sizeNum + padding * 2 + titleHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (includeTitle && selectedSurvey) {
      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(selectedSurvey.title, canvas.width / 2, 28);
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding + titleHeight, sizeNum, sizeNum);
      const link = document.createElement("a");
      link.download = `survey-qr-${selectedSurveyId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR code downloaded!");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const publishedSurveys = surveys.filter(s => s.status === "published");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" /> QR Code Generator
        </h3>
        <p className="text-sm text-muted-foreground">Generate QR codes for physical distribution — office posters, event handouts, etc.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs">Select Survey</Label>
              <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a published survey" /></SelectTrigger>
                <SelectContent>
                  {publishedSurveys.length === 0 ? (
                    <SelectItem value="_none" disabled>No published surveys</SelectItem>
                  ) : publishedSurveys.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Select value={fgColor} onValueChange={setFgColor}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {surveyUrl && (
              <div>
                <Label className="text-xs">Survey URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={surveyUrl} className="text-xs h-9" />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}><Copy className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleDownload} disabled={!selectedSurveyId} className="flex-1">
                <Download className="w-4 h-4 mr-1" /> Download PNG
              </Button>
              {selectedSurveyId && (
                <Button variant="outline" onClick={() => window.open(surveyUrl, "_blank")}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardContent className="p-5 flex flex-col items-center justify-center min-h-[300px]">
            {selectedSurveyId ? (
              <div ref={qrRef} className="text-center space-y-4">
                {includeTitle && selectedSurvey && (
                  <p className="text-sm font-semibold">{selectedSurvey.title}</p>
                )}
                <QRCodeSVG
                  value={surveyUrl}
                  size={Math.min(parseInt(size), 300)}
                  fgColor={fgColor}
                  bgColor="transparent"
                  level="M"
                  includeMargin
                />
                <p className="text-[10px] text-muted-foreground">Scan to take the survey</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a survey to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
