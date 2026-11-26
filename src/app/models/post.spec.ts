import { describe, expect, it } from 'vitest';
import { cleanOptions, myVote, pollResults, totalVotes } from './post';

describe('post helpers', () => {
  const poll = {
    options: ['Pátek', 'Sobota', 'Neděle'],
    votes: { anna: 0, bob: 1, cyril: 1, dana: 7 },
  };

  it('should count votes and ignore invalid ones', () => {
    expect(pollResults(poll).map((result) => result.count)).toEqual([1, 2, 0]);
    expect(totalVotes(poll)).toBe(3);
  });

  it('should compute rounded percentages', () => {
    expect(pollResults(poll).map((result) => result.percent)).toEqual([33, 67, 0]);
  });

  it('should return zero percent without votes', () => {
    expect(pollResults({ options: ['Ano', 'Ne'], votes: {} }).map((r) => r.percent)).toEqual([
      0, 0,
    ]);
  });

  it('should find the current user vote', () => {
    expect(myVote(poll, 'bob')).toBe(1);
    expect(myVote(poll, 'eva')).toBeNull();
    expect(myVote(poll, null)).toBeNull();
  });

  it('should clean poll options', () => {
    expect(cleanOptions([' Pátek ', '', 'pátek', 'Sobota', '   '])).toEqual(['Pátek', 'Sobota']);
  });
});
