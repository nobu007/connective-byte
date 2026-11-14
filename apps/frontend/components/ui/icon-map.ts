/**
 * コンテンツデータ（content/*.json の `icon` キー）で使用するアイコンの対応表。
 *
 * `import * as Icons from 'lucide-react'` は全アイコン（約1,500個・565KB）を
 * バンドルしてしまうため、ここに必要なアイコンだけを列挙して参照する。
 * 未登録の名前は undefined になり、各カードの `{Icon && ...}` ガードで
 * アイコンなしで描画される。
 */
import { Link, MessageCircleX, UserRoundX, UserX, Users, Zap } from 'lucide-react';

import type { ComponentType } from 'react';

export type ContentIcon = ComponentType<{ size?: number; className?: string }>;

export const contentIcons: Record<string, ContentIcon> = {
  'user-x': UserX,
  'message-circle-x': MessageCircleX,
  // lucide-reactに UsersX は存在しないため UserRoundX で代用
  'users-x': UserRoundX,
  link: Link,
  zap: Zap,
  users: Users,
};
