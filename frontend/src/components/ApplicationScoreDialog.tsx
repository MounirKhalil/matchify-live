import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Briefcase, Wrench, Award } from "lucide-react";

type Application = {
  id: string;
  education_score: number;
  experience_score: number;
  skills_score: number;
  final_score: number;
  hiring_status: string;
  job_posting: {
    job_title: string;
  };
};

type ApplicationScoreDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
};

export const ApplicationScoreDialog = ({
  open,
  onOpenChange,
  application,
}: ApplicationScoreDialogProps) => {
  if (!application) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-success text-success-foreground";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      case "potential_fit":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "potential_fit":
        return "Potential Fit";
      default:
        return status;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const scores = [
    {
      label: "Education",
      value: application.education_score,
      icon: GraduationCap,
      description: "Academic qualifications and degrees",
    },
    {
      label: "Experience",
      value: application.experience_score,
      icon: Briefcase,
      description: "Work experience and achievements",
    },
    {
      label: "Skills",
      value: application.skills_score,
      icon: Wrench,
      description: "Technical and soft skills match",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Award className="h-6 w-6 text-primary" />
            Application Evaluation
          </DialogTitle>
          <DialogDescription>
            AI-powered scoring for {application.job_posting.job_title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Final Score */}
          <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-2">Final Score</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className={`text-5xl font-bold ${getScoreColor(application.final_score)}`}>
                {application.final_score}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <Badge className={getStatusColor(application.hiring_status)}>
              {getStatusText(application.hiring_status)}
            </Badge>
          </div>

          {/* Individual Scores */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Score Breakdown</h3>
            {scores.map((score) => (
              <div key={score.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <score.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{score.label}</span>
                  </div>
                  <span className={`font-semibold ${getScoreColor(score.value)}`}>
                    {score.value}/100
                  </span>
                </div>
                <Progress value={score.value} className="h-2" />
                <p className="text-xs text-muted-foreground">{score.description}</p>
              </div>
            ))}
          </div>

          {/* Info Note */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">How scoring works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>AI evaluates your profile against job requirements</li>
              <li>Scores are based on education, experience, and skills match</li>
              <li>85+ = Accepted, 70-84 = Rejected, &lt;70 = Potential Fit</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
