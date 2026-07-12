export type AcademySource = {
  title: string;
  section: string;
  status: "approved_demo";
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type AcademyModule = {
  id: string;
  title: string;
  level: "Principiante";
  duration: string;
  objective: string;
  explanation: string;
  keyIdeas: string[];
  boundaries: string[];
  coverageQuestions: string[];
  keywords: string[];
  source: AcademySource;
  quiz: QuizQuestion[];
};

export type AcademyLeadContext = {
  id: string;
  fullName: string | null;
  objective: string | null;
  experience: string | null;
};
