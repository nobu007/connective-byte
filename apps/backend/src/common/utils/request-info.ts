/**
 * リクエスト付随情報の抽出（クライアントIP・User-Agent 分類）
 *
 * セッション管理・監査ログで使用。依存ライブラリなしの軽い正規表現分類。
 */

import { Request } from 'express';
import { DeviceInfo } from '../../modules/auth/interfaces/user-repository';

/**
 * クライアントIP。Cloudflare は必ず cf-connecting-ip を上書き設定するため
 * 詐称不可。ローカル開発では x-forwarded-for / req.ip にフォールバック。
 */
export function getClientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.length > 0) return cf;

  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();

  return req.ip ?? 'unknown';
}

/** User-Agent をブラウザ/OS/デバイスに粗分類（表示用。認証判定には使わない） */
export function parseDeviceInfo(userAgent: string | undefined): DeviceInfo {
  const ua = userAgent ?? '';

  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const device = /Mobile|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';

  return { userAgent: ua, browser, os, device };
}
