import type { Metadata } from "next";
import QuizFlow from "./quiz-flow";

export const metadata: Metadata = { title: "Polish Score Quiz" };

export default function QuizPage() {
  return <QuizFlow />;
}
