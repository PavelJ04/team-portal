export type PostType = 'announcement' | 'poll';

/** Příspěvek na nástěnce: oznámení trenéra nebo anketa. */
export interface Post {
  id: string;
  type: PostType;
  title: string;
  text: string;
  /** Možnosti ankety; u oznámení prázdné pole. */
  options: string[];
  /** Hlasy hráčů: klíčem je UID, hodnotou index zvolené možnosti. */
  votes: Record<string, number>;
  authorName: string;
  createdBy: string;
  createdAt: string;
}

export type PostInput = Pick<Post, 'type' | 'title' | 'text' | 'options'>;

export interface PollResult {
  option: string;
  count: number;
  /** Podíl hlasů v procentech zaokrouhlený na celé číslo. */
  percent: number;
}

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 5;

export const POST_TYPE_LABELS: Record<PostType, string> = {
  announcement: 'Oznámení',
  poll: 'Anketa',
};

/** Výsledky ankety ve stejném pořadí jako možnosti. Neplatné hlasy se nepočítají. */
export function pollResults(post: Pick<Post, 'options' | 'votes'>): PollResult[] {
  const counts = post.options.map(() => 0);

  for (const index of Object.values(post.votes)) {
    if (Number.isInteger(index) && index >= 0 && index < counts.length) {
      counts[index] += 1;
    }
  }

  const total = counts.reduce((sum, count) => sum + count, 0);

  return post.options.map((option, index) => ({
    option,
    count: counts[index],
    percent: total === 0 ? 0 : Math.round((counts[index] / total) * 100),
  }));
}

export function totalVotes(post: Pick<Post, 'options' | 'votes'>): number {
  return pollResults(post).reduce((sum, result) => sum + result.count, 0);
}

/** Index možnosti, pro kterou hlasoval uživatel; null, pokud nehlasoval. */
export function myVote(post: Pick<Post, 'votes'>, uid: string | null): number | null {
  if (uid === null) {
    return null;
  }

  const vote = post.votes[uid];
  return Number.isInteger(vote) ? vote : null;
}

/** Očistí možnosti ankety: ořízne mezery a odstraní prázdné a duplicitní položky. */
export function cleanOptions(options: string[]): string[] {
  const result: string[] = [];

  for (const option of options) {
    const value = option.trim();
    const duplicate = result.some((item) => item.toLowerCase() === value.toLowerCase());
    if (value && !duplicate) {
      result.push(value);
    }
  }

  return result;
}
