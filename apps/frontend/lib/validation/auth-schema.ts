/**
 * auth ページ用バリデーションスキーマ
 * ポリシーは backend AuthService.validatePassword と同一（8字以上 + 大文字 + 小文字 + 数字）。
 */

import { z } from 'zod';

export const authEmailSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export type AuthEmailFormData = z.infer<typeof authEmailSchema>;

export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .regex(/[A-Z]/, '大文字を1文字以上含めてください')
  .regex(/[a-z]/, '小文字を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください');

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
