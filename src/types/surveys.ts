export type SurveyStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SurveyCategory = 'engagement' | 'enps' | 'candidate_experience' | 'onboarding' | 'exit_interview' | 'learning_feedback' | 'pulse' | 'custom';
export type AudienceType = 'internal' | 'candidates' | 'public' | 'private';
export type QuestionType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice'
  | 'dropdown' | 'rating' | 'likert' | 'nps' | 'yes_no' | 'date'
  | 'section_divider' | 'statement';

export type ConditionOperator = 'equals' | 'not_equals' | 'includes' | 'greater_than' | 'less_than' | 'one_of';

export interface QuestionCondition {
  source_question_key: string; // _key of the source question
  operator: ConditionOperator;
  value: string | string[] | number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: SurveyCategory;
  audience_type: AudienceType;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  response_deadline: string | null;
  thank_you_message: string;
  cover_image_url: string | null;
  status: SurveyStatus;
  is_public: boolean;
  max_responses: number | null;
  created_at: string;
  updated_at: string;
  questions?: SurveyQuestion[];
  response_count?: number;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  question_text: string;
  help_text: string | null;
  placeholder: string | null;
  is_required: boolean;
  options: string[];
  order_index: number;
  settings: Record<string, any>;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_department: string | null;
  is_anonymous: boolean;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed';
  answers?: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: any;
  created_at: string;
}

export const SURVEY_CATEGORIES: { value: SurveyCategory; label: string }[] = [
  { value: 'engagement', label: 'Employee Engagement' },
  { value: 'enps', label: 'eNPS' },
  { value: 'candidate_experience', label: 'Candidate Experience' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'exit_interview', label: 'Exit Interview' },
  { value: 'learning_feedback', label: 'Learning Feedback' },
  { value: 'pulse', label: 'Pulse Survey' },
  { value: 'custom', label: 'Custom' },
];

export const AUDIENCE_TYPES: { value: AudienceType; label: string }[] = [
  { value: 'internal', label: 'Internal Employees' },
  { value: 'candidates', label: 'Candidates' },
  { value: 'public', label: 'Public (External)' },
  { value: 'private', label: 'Private (Invite Only)' },
];

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'short_text', label: 'Short Text', icon: 'Type' },
  { value: 'long_text', label: 'Long Text', icon: 'AlignLeft' },
  { value: 'single_choice', label: 'Single Choice', icon: 'CircleDot' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'CheckSquare' },
  { value: 'dropdown', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'rating', label: 'Rating Scale', icon: 'Star' },
  { value: 'likert', label: 'Likert Scale', icon: 'BarChart3' },
  { value: 'nps', label: 'Net Promoter Score', icon: 'Gauge' },
  { value: 'yes_no', label: 'Yes / No', icon: 'ToggleLeft' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'section_divider', label: 'Section Divider', icon: 'Minus' },
  { value: 'statement', label: 'Statement / Info', icon: 'Info' },
];

export const SURVEY_STATUSES: { value: SurveyStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'published', label: 'Published', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'closed', label: 'Closed', color: 'bg-red-500/20 text-red-400' },
  { value: 'archived', label: 'Archived', color: 'bg-muted text-muted-foreground' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'includes', label: 'Includes' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'one_of', label: 'Is one of' },
];

export interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  category: SurveyCategory;
  questions: Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'>[];
}

export interface TextInsight {
  themes: { theme: string; count: number; sentiment: 'positive' | 'neutral' | 'concern' | 'urgent' }[];
  summary: string;
  positive_highlights: string[];
  concerns: string[];
  action_items: string[];
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'enps',
    title: 'eNPS Survey',
    description: 'Measure employee loyalty with a Net Promoter Score survey.',
    category: 'enps',
    questions: [
      { type: 'nps', question_text: 'On a scale of 0-10, how likely are you to recommend this company as a place to work?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 0, settings: {} },
      { type: 'long_text', question_text: 'What is the primary reason for your score?', help_text: null, placeholder: 'Share your thoughts...', is_required: true, options: [], order_index: 1, settings: {} },
      { type: 'long_text', question_text: 'What could we improve to make this a better place to work?', help_text: null, placeholder: 'Your suggestions...', is_required: false, options: [], order_index: 2, settings: {} },
    ],
  },
  {
    id: 'onboarding-30-60-90',
    title: '30-60-90 Day Onboarding Feedback',
    description: 'Gather feedback from new hires at key milestones.',
    category: 'onboarding',
    questions: [
      { type: 'single_choice', question_text: 'Which milestone are you at?', help_text: null, placeholder: null, is_required: true, options: ['30 Days', '60 Days', '90 Days'], order_index: 0, settings: {} },
      { type: 'rating', question_text: 'How would you rate your onboarding experience so far?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 1, settings: { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' } },
      { type: 'likert', question_text: 'I feel well-supported by my manager.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'likert', question_text: 'I have the tools and resources I need to do my job.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 3, settings: {} },
      { type: 'long_text', question_text: 'What has been the best part of your onboarding?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 4, settings: {} },
      { type: 'long_text', question_text: 'What could be improved?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 5, settings: {} },
    ],
  },
  {
    id: 'candidate-experience',
    title: 'Candidate Experience Survey',
    description: 'Evaluate the recruitment process from the candidate perspective.',
    category: 'candidate_experience',
    questions: [
      { type: 'rating', question_text: 'How would you rate your overall interview experience?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 0, settings: { min: 1, max: 5, minLabel: 'Very Poor', maxLabel: 'Excellent' } },
      { type: 'likert', question_text: 'The job description accurately reflected the role.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 1, settings: {} },
      { type: 'likert', question_text: 'The interviewers were professional and prepared.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'single_choice', question_text: 'How timely was our communication?', help_text: null, placeholder: null, is_required: true, options: ['Very timely', 'Somewhat timely', 'Delayed', 'Very delayed'], order_index: 3, settings: {} },
      { type: 'long_text', question_text: 'Any additional feedback about your experience?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 4, settings: {} },
    ],
  },
  {
    id: 'exit-interview',
    title: 'Exit Interview Survey',
    description: 'Understand why employees leave and how to improve retention.',
    category: 'exit_interview',
    questions: [
      { type: 'single_choice', question_text: 'What is the primary reason for your departure?', help_text: null, placeholder: null, is_required: true, options: ['Career growth', 'Compensation', 'Work-life balance', 'Management', 'Relocation', 'Other'], order_index: 0, settings: {} },
      { type: 'rating', question_text: 'How satisfied were you with your role overall?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 1, settings: { min: 1, max: 5, minLabel: 'Very Dissatisfied', maxLabel: 'Very Satisfied' } },
      { type: 'likert', question_text: 'I felt valued by my manager.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'nps', question_text: 'How likely are you to recommend this company as a place to work?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 3, settings: {} },
      { type: 'long_text', question_text: 'What could we have done differently to retain you?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 4, settings: {} },
    ],
  },
  {
    id: 'learning-feedback',
    title: 'Learning Session Feedback',
    description: 'Collect feedback after training or learning sessions.',
    category: 'learning_feedback',
    questions: [
      { type: 'short_text', question_text: 'Which training session did you attend?', help_text: null, placeholder: 'Session name', is_required: true, options: [], order_index: 0, settings: {} },
      { type: 'rating', question_text: 'How would you rate the session overall?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 1, settings: { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' } },
      { type: 'likert', question_text: 'The content was relevant to my role.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'likert', question_text: 'The trainer was engaging and knowledgeable.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 3, settings: {} },
      { type: 'long_text', question_text: 'What topics would you like covered in future sessions?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 4, settings: {} },
    ],
  },
  {
    id: 'engagement-pulse',
    title: 'Employee Engagement Pulse Survey',
    description: 'Quick check-in on employee engagement and wellbeing.',
    category: 'pulse',
    questions: [
      { type: 'rating', question_text: 'How happy are you at work this week?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 0, settings: { min: 1, max: 5, minLabel: '😞', maxLabel: '😊' } },
      { type: 'likert', question_text: 'I feel motivated to do my best work.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 1, settings: {} },
      { type: 'likert', question_text: 'I feel my work is recognized.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'yes_no', question_text: 'Do you have any blockers preventing you from doing your best work?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 3, settings: {} },
      { type: 'long_text', question_text: 'Anything else you would like to share?', help_text: null, placeholder: 'Optional feedback...', is_required: false, options: [], order_index: 4, settings: {} },
    ],
  },
  {
    id: 'manager-feedback',
    title: 'Manager Feedback Survey',
    description: 'Gather feedback on manager effectiveness from direct reports.',
    category: 'engagement',
    questions: [
      { type: 'likert', question_text: 'My manager communicates expectations clearly.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 0, settings: {} },
      { type: 'likert', question_text: 'My manager provides regular and constructive feedback.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 1, settings: {} },
      { type: 'likert', question_text: 'My manager supports my career development.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 2, settings: {} },
      { type: 'likert', question_text: 'My manager creates a positive team environment.', help_text: null, placeholder: null, is_required: true, options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'], order_index: 3, settings: {} },
      { type: 'rating', question_text: 'Overall, how effective is your manager?', help_text: null, placeholder: null, is_required: true, options: [], order_index: 4, settings: { min: 1, max: 5, minLabel: 'Ineffective', maxLabel: 'Highly Effective' } },
      { type: 'long_text', question_text: 'What does your manager do well?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 5, settings: {} },
      { type: 'long_text', question_text: 'What could your manager improve?', help_text: null, placeholder: null, is_required: false, options: [], order_index: 6, settings: {} },
    ],
  },
];
