/**
 * StatusBadge のテスト — 未着手 / 進行中 / 完了 / ロック（受講登録が必要）
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('not_started: 未着手', () => {
    render(<StatusBadge status="not_started" />);
    expect(screen.getByText('未着手')).toBeInTheDocument();
  });

  it('in_progress: 進行中', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('進行中')).toBeInTheDocument();
  });

  it('completed: 完了', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('完了')).toBeInTheDocument();
  });

  it('locked: 受講登録が必要（Weeks 2-12 の未購入）', () => {
    render(<StatusBadge status="locked" />);
    expect(screen.getByText('受講登録が必要')).toBeInTheDocument();
  });
});
