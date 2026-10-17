import { ComingSoon } from '../components/ComingSoon';

export default function StepsScreen() {
  return (
    <ComingSoon
      title="Steps"
      step={3}
      description="A weekly bar chart against your goal, 7-day average, goal days, distance and calories."
    />
  );
}
