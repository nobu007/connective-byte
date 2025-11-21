/**
 * KPI Alert System
 * Monitors KPIs and generates alerts
 */

import { randomUUID } from 'crypto';
import { KPIAlert, KPIValue, KPIDefinition, KPIStatus } from './types';

export interface AlertHandler {
  onAlert(alert: KPIAlert): void;
}

export class KPIAlertSystem {
  private alerts = new Map<string, KPIAlert>();
  private handlers: AlertHandler[] = [];

  public registerHandler(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  public checkValue(value: KPIValue, kpi: KPIDefinition): KPIAlert | null {
    if (value.status === 'normal') {
      return null;
    }

    const threshold =
      value.status === 'critical' ? kpi.thresholds.critical : kpi.thresholds.warning;

    const alert: KPIAlert = {
      id: randomUUID(),
      kpiId: kpi.id,
      status: value.status,
      value: value.value,
      threshold,
      message: this.generateMessage(kpi, value, threshold),
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);
    this.notifyHandlers(alert);

    return alert;
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  public getActiveAlerts(): KPIAlert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.acknowledged);
  }

  public getAlertsByKPI(kpiId: string): KPIAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.kpiId === kpiId);
  }

  public clearAcknowledgedAlerts(): number {
    let cleared = 0;
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.acknowledged) {
        this.alerts.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  private generateMessage(kpi: KPIDefinition, value: KPIValue, threshold: number): string {
    const status = value.status === 'critical' ? '重大' : '警告';
    const comparison = kpi.higherIsBetter ? '下回りました' : '超過しました';

    return `${status}: ${kpi.name}が閾値${threshold}${kpi.unit}を${comparison}（現在値: ${value.value}${kpi.unit}）`;
  }

  private notifyHandlers(alert: KPIAlert): void {
    for (const handler of this.handlers) {
      try {
        handler.onAlert(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }
}
