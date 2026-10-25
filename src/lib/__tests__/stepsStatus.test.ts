import { stepsStatusContent } from '../stepsStatus';

describe('stepsStatusContent', () => {
  it('shows steps to go before the goal is met', () => {
    expect(stepsStatusContent(4300, 9700, { state: 'today', stepsNeeded: 5400 })).toEqual({
      title: '4,300 steps today',
      body: '5,400 to go for 9,700',
    });
  });

  it('adds the retro days once the goal is met', () => {
    expect(
      stepsStatusContent(10649, 9700, { state: 'extend', coveredDays: 62, nextDays: 63, stepsNeeded: 4740 }),
    ).toEqual({ title: '10,649 steps today', body: 'Goal 9,700 done · Retro: 62 days' });
  });

  it('says when every day is covered', () => {
    expect(stepsStatusContent(10649, 9700, { state: 'all', coveredDays: 222 }).body).toBe(
      'Goal 9,700 done · Retro: all 222 days covered',
    );
    expect(stepsStatusContent(9700, 9700, { state: 'all', coveredDays: 1 }).body).toBe(
      'Goal 9,700 done · Retro: all 1 day covered',
    );
  });
});
