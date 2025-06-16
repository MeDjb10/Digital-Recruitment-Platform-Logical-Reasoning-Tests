import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RealtimeSecurityAlertService, SecurityAlert } from '../../../candidate/DominoTest/services/realtime-security-alert.service';

@Component({
  selector: 'app-security-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-monitor">
      <div class="monitor-header">
        <h2>
          <i class="pi pi-shield"></i>
          Real-Time Security Monitor
        </h2>
        <div class="connection-status" [class.connected]="isConnected" [class.disconnected]="!isConnected">
          <i class="pi" [ngClass]="isConnected ? 'pi-wifi' : 'pi-wifi-off'"></i>
          <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>

      <div class="alert-stats">
        <div class="stat-card critical">
          <div class="stat-number">{{ criticalAlerts }}</div>
          <div class="stat-label">Critical Alerts</div>
        </div>
        <div class="stat-card high">
          <div class="stat-number">{{ highAlerts }}</div>
          <div class="stat-label">High Priority</div>
        </div>
        <div class="stat-card medium">
          <div class="stat-number">{{ mediumAlerts }}</div>
          <div class="stat-label">Medium Priority</div>
        </div>
        <div class="stat-card low">
          <div class="stat-number">{{ lowAlerts }}</div>
          <div class="stat-label">Low Priority</div>
        </div>
      </div>

      <div class="alerts-container">
        <div class="alerts-header">
          <h3>Live Security Alerts</h3>
          <div class="alert-controls">
            <button class="btn btn-secondary" (click)="clearAlerts()">
              <i class="pi pi-trash"></i>
              Clear All
            </button>
            <button class="btn btn-primary" (click)="refreshAlerts()">
              <i class="pi pi-refresh"></i>
              Refresh
            </button>
          </div>
        </div>

        <div class="alerts-list" #alertsList>
          <div *ngFor="let alert of alerts; trackBy: trackByAlertId" 
               class="alert-item" 
               [class]="'severity-' + alert.severity.toLowerCase()"
               [class.new-alert]="isNewAlert(alert)">
            
            <div class="alert-header">
              <div class="alert-severity">
                <i class="pi" [ngClass]="getSeverityIcon(alert.severity)"></i>
                <span class="severity-badge" [class]="'badge-' + alert.severity.toLowerCase()">
                  {{ alert.severity }}
                </span>
              </div>
              <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
            </div>

            <div class="alert-content">
              <div class="alert-type">
                <strong>{{ formatAlertType(alert.alertType) }}</strong>
              </div>
              <div class="alert-description">{{ alert.description }}</div>
              
              <div class="candidate-info">
                <div class="info-item">
                  <i class="pi pi-user"></i>
                  <span>{{ alert.candidateName || 'Unknown Candidate' }}</span>
                </div>
                <div class="info-item">
                  <i class="pi pi-bookmark"></i>
                  <span>{{ alert.testId }}</span>
                </div>
                <div class="info-item">
                  <i class="pi pi-file"></i>
                  <span>Question {{ alert.questionIndex + 1 }}</span>
                </div>
                <div class="info-item" *ngIf="alert.warningCount">
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>Warning {{ alert.warningCount }}/{{ alert.maxWarnings }}</span>
                </div>
              </div>

              <div class="alert-actions">
                <button class="btn btn-sm btn-outline" (click)="acknowledgeAlert(alert)">
                  <i class="pi pi-check"></i>
                  Acknowledge
                </button>
                <button class="btn btn-sm btn-warning" (click)="requestIntervention(alert)"
                        *ngIf="alert.severity === 'CRITICAL' || alert.severity === 'HIGH'">
                  <i class="pi pi-bell"></i>
                  Intervene
                </button>
                <button class="btn btn-sm btn-info" (click)="viewDetails(alert)">
                  <i class="pi pi-info-circle"></i>
                  Details
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="alerts.length === 0" class="no-alerts">
            <i class="pi pi-shield"></i>
            <p>No security alerts at this time</p>
            <small>All tests are running securely</small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-monitor {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e0e0e0;
    }

    .monitor-header h2 {
      color: #333;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .connection-status.connected {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .connection-status.disconnected {
      background-color: #ffebee;
      color: #c62828;
      animation: pulse 2s infinite;
    }

    .alert-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      border-left: 4px solid;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-card.critical { border-left-color: #f44336; }
    .stat-card.high { border-left-color: #ff9800; }
    .stat-card.medium { border-left-color: #ffc107; }
    .stat-card.low { border-left-color: #4caf50; }

    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-card.critical .stat-number { color: #f44336; }
    .stat-card.high .stat-number { color: #ff9800; }
    .stat-card.medium .stat-number { color: #ffc107; }
    .stat-card.low .stat-number { color: #4caf50; }

    .stat-label {
      color: #666;
      font-size: 0.9rem;
    }

    .alerts-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .alerts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .alerts-header h3 {
      margin: 0;
      color: #333;
    }

    .alert-controls {
      display: flex;
      gap: 10px;
    }

    .alerts-list {
      max-height: 600px;
      overflow-y: auto;
    }

    .alert-item {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      transition: all 0.3s ease;
    }

    .alert-item.new-alert {
      animation: newAlert 1s ease-out;
    }

    .severity-critical {
      border-left: 4px solid #f44336;
      background: linear-gradient(90deg, #ffebee 0%, white 20%);
    }

    .severity-high {
      border-left: 4px solid #ff9800;
      background: linear-gradient(90deg, #fff3e0 0%, white 20%);
    }

    .severity-medium {
      border-left: 4px solid #ffc107;
      background: linear-gradient(90deg, #fffde7 0%, white 20%);
    }

    .severity-low {
      border-left: 4px solid #4caf50;
      background: linear-gradient(90deg, #e8f5e8 0%, white 20%);
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .alert-severity {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .severity-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: bold;
      text-transform: uppercase;
    }

    .badge-critical { background: #f44336; color: white; }
    .badge-high { background: #ff9800; color: white; }
    .badge-medium { background: #ffc107; color: #333; }
    .badge-low { background: #4caf50; color: white; }

    .alert-time {
      font-size: 0.85rem;
      color: #666;
    }

    .alert-content {
      margin-left: 20px;
    }

    .alert-type {
      margin-bottom: 8px;
      color: #333;
    }

    .alert-description {
      margin-bottom: 15px;
      color: #555;
    }

    .candidate-info {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.85rem;
      color: #555;
    }

    .alert-actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: #333;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #ccc;
      color: #555;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .no-alerts {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .no-alerts i {
      font-size: 3rem;
      margin-bottom: 15px;
      color: #4caf50;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    @keyframes newAlert {
      0% { background-color: #fff3cd; }
      100% { background-color: transparent; }
    }
  `]
})
export class SecurityMonitorComponent implements OnInit, OnDestroy {
  alerts: SecurityAlert[] = [];
  isConnected: boolean = false;
  newAlertIds: Set<string> = new Set();
  
  private alertSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  // Alert statistics
  criticalAlerts: number = 0;
  highAlerts: number = 0;
  mediumAlerts: number = 0;
  lowAlerts: number = 0;

  constructor(private securityAlertService: RealtimeSecurityAlertService) {}

  ngOnInit(): void {
    this.initializeMonitoring();
    this.loadActiveAlerts();
  }

  ngOnDestroy(): void {
    if (this.alertSubscription) {
      this.alertSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  private initializeMonitoring(): void {
    // Subscribe to real-time alerts
    this.alertSubscription = this.securityAlertService.getSecurityAlerts().subscribe({
      next: (alert) => {
        this.addNewAlert(alert);
        this.playAlertSound(alert.severity);
      },
      error: (error) => {
        console.error('Error receiving alerts:', error);
      }
    });

    // Monitor connection status
    this.connectionSubscription = this.securityAlertService.getConnectionStatus().subscribe({
      next: (connected) => {
        this.isConnected = connected;
      }
    });
  }

  private loadActiveAlerts(): void {
    this.securityAlertService.getActiveAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.updateStatistics();
      },
      error: (error) => {
        console.error('Error loading active alerts:', error);
      }
    });
  }

  private addNewAlert(alert: SecurityAlert): void {
    // Add alert to the beginning of the list
    this.alerts.unshift(alert);
    
    // Mark as new alert
    if (alert.id) {
      this.newAlertIds.add(alert.id);
      // Remove the "new" marking after 5 seconds
      setTimeout(() => {
        this.newAlertIds.delete(alert.id!);
      }, 5000);
    }

    // Update statistics
    this.updateStatistics();

    // Show browser notification for critical alerts
    if (alert.severity === 'CRITICAL') {
      this.showBrowserNotification(alert);
    }
  }

  private updateStatistics(): void {
    this.criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL').length;
    this.highAlerts = this.alerts.filter(a => a.severity === 'HIGH').length;
    this.mediumAlerts = this.alerts.filter(a => a.severity === 'MEDIUM').length;
    this.lowAlerts = this.alerts.filter(a => a.severity === 'LOW').length;
  }

  private playAlertSound(severity: SecurityAlert['severity']): void {
    try {
      const audio = new Audio();
      
      switch (severity) {
        case 'CRITICAL':
          audio.src = 'assets/sounds/critical-alert.mp3';
          break;
        case 'HIGH':
          audio.src = 'assets/sounds/high-alert.mp3';
          break;
        case 'MEDIUM':
          audio.src = 'assets/sounds/medium-alert.mp3';
          break;
        default:
          return; // No sound for low alerts
      }

      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play alert sound:', error);
      });
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }

  private showBrowserNotification(alert: SecurityAlert): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 CRITICAL Security Alert', {
        body: `${alert.candidateName}: ${alert.description}`,
        icon: '/assets/icons/security-alert.png',
        tag: alert.id
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(alert);
        }
      });
    }
  }

  // Component methods
  trackByAlertId(index: number, alert: SecurityAlert): string {
    return alert.id || `${alert.attemptId}-${alert.timestamp}`;
  }

  isNewAlert(alert: SecurityAlert): boolean {
    return alert.id ? this.newAlertIds.has(alert.id) : false;
  }

  formatTime(timestamp: string): string {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return alertTime.toLocaleDateString();
  }

  formatAlertType(alertType: SecurityAlert['alertType']): string {
    return alertType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getSeverityIcon(severity: SecurityAlert['severity']): string {
    switch (severity) {
      case 'CRITICAL': return 'pi-exclamation-triangle';
      case 'HIGH': return 'pi-exclamation-circle';
      case 'MEDIUM': return 'pi-info-circle';
      case 'LOW': return 'pi-info';
      default: return 'pi-info';
    }
  }

  acknowledgeAlert(alert: SecurityAlert): void {
    if (!alert.id) return;
    
    const psychologistId = 'current-user-id'; // Get from auth service
    this.securityAlertService.acknowledgeAlert(alert.id, psychologistId).subscribe({
      next: () => {
        // Remove from active alerts
        this.alerts = this.alerts.filter(a => a.id !== alert.id);
        this.updateStatistics();
      },
      error: (error) => {
        console.error('Error acknowledging alert:', error);
      }
    });
  }
  requestIntervention(securityAlert: SecurityAlert): void {
    const reason = prompt('Please provide a reason for intervention:');
    if (!reason) return;

    const psychologistId = 'current-user-id'; // Get from auth service
    this.securityAlertService.requestIntervention(securityAlert.attemptId, reason, psychologistId).subscribe({
      next: () => {
        securityAlert.additionalData = { ...securityAlert.additionalData, interventionRequested: true };
        window.alert('Intervention request sent successfully!');
      },
      error: (error) => {
        console.error('Error requesting intervention:', error);
        window.alert('Failed to send intervention request. Please try again.');
      }
    });
  }

  viewDetails(securityAlert: SecurityAlert): void {
    // Open modal or navigate to detailed view
    console.log('Alert details:', securityAlert);
    // For now, just log - could open a modal with full details
    const details = `
Alert Details:
- Type: ${this.formatAlertType(securityAlert.alertType)}
- Severity: ${securityAlert.severity}
- Candidate: ${securityAlert.candidateName}
- Test: ${securityAlert.testId}
- Time: ${securityAlert.timestamp}
- Description: ${securityAlert.description}
- Additional Data: ${JSON.stringify(securityAlert.additionalData, null, 2)}
    `;
    window.alert(details);
  }

  clearAlerts(): void {
    if (confirm('Are you sure you want to clear all alerts?')) {
      this.alerts = [];
      this.updateStatistics();
    }
  }

  refreshAlerts(): void {
    this.loadActiveAlerts();
  }
}
