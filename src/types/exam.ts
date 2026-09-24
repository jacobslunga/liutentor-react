export interface Course {
  code: string;
  name: string;
  examCount: number;
}

export interface Exam {
  id: number;
  exam_name: string;
  exam_date: string;
  has_solution: boolean;
  pass_rate: number;
  statistics: Record<string, number>;
  pdf_url: string;
  course_code: string;
}

export interface CourseExams {
  courseCode: string;
  courseName: string;
  exams: Exam[];
}

export interface ExamDetail {
  exam: Pick<Exam, "id" | "course_code" | "exam_date" | "pdf_url">;
  solution: {
    id: number;
    exam_id: number;
    pdf_url: string;
    solution_name: string;
  } | null;
}
