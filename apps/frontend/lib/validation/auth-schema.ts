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

// --- ログイン / 登録 ----------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'お名前を入力してください').max(100, 'お名前は100文字以内で入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// --- マイページ（セキュリティタブ） --------------------------------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '現在のパスワードと同じパスワードは設定できません',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// --- マイページ（プロフィールタブ）: backend UserService の検証と同一 -------------

const GITHUB_USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'お名前を入力してください').max(100, 'お名前は100文字以内で入力してください'),
  bio: z.string().max(500, '自己紹介は500文字以内で入力してください'),
  timezone: z.string().max(64, 'タイムゾーンは64文字以内で入力してください'),
  githubUsername: z
    .string()
    .trim()
    .refine((value) => value === '' || GITHUB_USERNAME_RE.test(value), {
      message: 'GitHubユーザー名の形式が正しくありません（英数字とハイフン、39文字以内）',
    }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
