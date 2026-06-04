import { useState } from "react";
import { Clock, CalendarCheck, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Props {
  scheduledAt: string;
  onScheduleChange: (date: string) => void;
  reminderEnabled: boolean;
  onReminderChange: (enabled: boolean) => void;
  reminderDays: number;
  onReminderDaysChange: (days: number) => void;
}

const SurveyScheduler = ({ scheduledAt, onScheduleChange, reminderEnabled, onReminderChange, reminderDays, onReminderDaysChange }: Props) => {
  const isScheduled = !!scheduledAt;
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isFuture = scheduledDate && scheduledDate > new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Survey Scheduling</span>
        {isScheduled && isFuture && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <CalendarCheck className="w-3 h-3" /> Scheduled
          </Badge>
        )}
      </div>

      <div>
        <Label className="text-xs">Auto-Publish Date & Time</Label>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => onScheduleChange(e.target.value)}
          className="mt-1 h-9"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Survey will automatically be published at this time
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">Auto-Reminder</p>
            <p className="text-[10px] text-muted-foreground">Send reminders to non-respondents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reminderEnabled && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">after</span>
              <Input
                type="number"
                value={reminderDays}
                onChange={(e) => onReminderDaysChange(parseInt(e.target.value) || 3)}
                className="w-14 h-7 text-xs text-center"
                min={1}
                max={30}
              />
              <span className="text-[10px] text-muted-foreground">days</span>
            </div>
          )}
          <Switch checked={reminderEnabled} onCheckedChange={onReminderChange} />
        </div>
      </div>
    </div>
  );
};

export default SurveyScheduler;
