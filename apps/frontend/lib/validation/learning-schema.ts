/**
 * 学習管理フォームの検証スキーマ（zod v4）
 *
 * slug 形式は backend の SLUG_PATTERN（^[a-z0-9-]{1,80}$）と一致させること。
 * サーバ側でも同じ検証が走くが、フォームでは即時フィードバック用。
 */

import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

const slugField = z
  .string()
  .trim()
  .regex(SLUG_PATTERN, 'slug は半角英小文字・数字・ハイフン（最大80文字）で入力してください');

export const sessionFormSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200, 'タイトルは200文字以内です'),
  description: z.string().trim().max(500, '説明は500文字以内です'),
  content: z.string().min(1, '本文を入力してください').max(100_000, '本文が大きすぎます（100,000文字以内）'),
  durationMinutes: z.coerce
    .number()
    .int('所要時間は整数（分）で入力してください')
    .min(1, '所要時間は1分以上です')
    .max(600, '所要時間は600分以内です'),
  objectives: z.array(z.string().trim().min(1, '空行の目標は除外してください')).max(20, '目標は20件以内です'),
  isPublished: z.boolean(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

/** zod エラーを field → メッセージ のマップへ変換（最初のエラーを採用） */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in map)) map[key] = issue.message;
  }
  return map;
}
