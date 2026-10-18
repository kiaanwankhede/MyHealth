import { ComingSoon } from '../../components/ComingSoon';

export default function LabsScreen() {
  return (
    <ComingSoon
      title="Cholesterol"
      step={3}
      description="Enter total, LDL, HDL and triglycerides from each lab report and see the trend between tests."
    />
  );
}
