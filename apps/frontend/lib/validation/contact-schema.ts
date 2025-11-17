import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'お名前は2文字以上で入力してください').max(50, 'お名前は50文字以内で入力してください'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(100, 'メールアドレスは100文字以内で入力してください'),
  message: z
    .string()
    .min(10, 'メッセージは10文字以上で入力してください')
    .max(1000, 'メッセージは1000文字以内で入力してください'),
  consent: z.boolean().refine((val) => val === true, 'プライバシーポリシーに同意してください'),
});

export type ContactFormData = z.infer<typeof contactSchema>;
