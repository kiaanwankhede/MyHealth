import { ComingSoon } from '../components/ComingSoon';

export default function WeightScreen() {
  return (
    <ComingSoon
      title="Weight"
      step={2}
      description="Your weight-loss goal with a target date: trend line, plan line, projection and whether you're ahead or behind."
    />
  );
}
