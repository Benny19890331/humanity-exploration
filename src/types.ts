export interface QuestionType {
  text: string;
  options: {
    value: number;
    text: string;
  }[];
}

export interface PersonalityResult {
  type: string;
  description: string;
  imageUrl: string;
}