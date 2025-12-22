import { useState } from "react";
import GradeSelector from "@/components/GradeSelector";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [selectedGrade, setSelectedGrade] = useState<7 | 8 | null>(null);

  if (selectedGrade === null) {
    return <GradeSelector onSelectGrade={setSelectedGrade} />;
  }

  return (
    <Dashboard grade={selectedGrade} onBack={() => setSelectedGrade(null)} />
  );
};

export default Index;
