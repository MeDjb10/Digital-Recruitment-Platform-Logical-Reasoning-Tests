import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface SecurityAlert {
  id?: string;
  attemptId: string;
  testId: string;
  candidateId: string;
  candidateName?: string;
  alertType: 'TAB_SWITCH' | 'SCREENSHOT_ATTEMPT' | 'DEVTOOLS_DETECTED' | 'COPY_PASTE' | 'RIGHT_CLICK' | 'RAPID_FOCUS_CHANGE' | 'NAVIGATION_ATTEMPT' | 'TEST_SUBMITTED_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  questionIndex: number;
  userAgent: string;
  ipAddress?: string;
  additionalData?: any;
  warningCount?: number;
  maxWarnings?: number;
}

export interface AlertResponse {
  success: boolean;
  alertId?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeSecurityAlertService {
  private baseUrl = 'http://localhost:5002'; // Direct URL for security alert service
  private alertsSubject = new Subject<SecurityAlert>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  
  // WebSocket connection for real-time updates
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }  /**
   * Initialize WebSocket connection for real-time alerts
   */
  private initializeWebSocket(): void {
    try {
      // Connect directly to the security alert service WebSocket endpoint
      const wsUrl = 'ws://localhost:5002/security-alerts';
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('🔗 Security alerts WebSocket connected');
        this.connectionStatus.next(true);
        this.reconnectAttempts = 0;
      };

      this.websocket.onmessage = (event) => {
        try {
          const alert: SecurityAlert = JSON.parse(event.data);
          this.alertsSubject.next(alert);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('🔌 Security alerts WebSocket disconnected');
        this.connectionStatus.next(false);
        this.attemptReconnect();
      };

      this.websocket.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        this.connectionStatus.next(false);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.connectionStatus.next(false);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.reconnectInterval);
    } else {
      console.error('❌ Max reconnection attempts reached for WebSocket');
    }
  }

  /**
   * Send security alert to backend and notify psychologists in real-time
   */
  sendSecurityAlert(alert: SecurityAlert): Observable<AlertResponse> {
    // Send HTTP request to backend
    const httpAlert = this.http.post<AlertResponse>(`${this.baseUrl}/api/security/alerts`, alert);

    // Also send via WebSocket for real-time delivery if connected
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify({
          type: 'SECURITY_ALERT',
          data: alert
        }));
        console.log('🚨 Real-time security alert sent via WebSocket');
      } catch (error) {
        console.error('Failed to send WebSocket alert:', error);
      }
    }

    return httpAlert;
  }

  /**
   * Send critical security violation (immediate attention required)
   */
  sendCriticalViolation(alert: SecurityAlert): Observable<AlertResponse> {
    alert.severity = 'CRITICAL';
    
    // For critical violations, also try multiple notification channels
    const enhancedAlert = {
      ...alert,
      urgent: true,
      requiresImmediateAttention: true,
      timestamp: new Date().toISOString()
    };

    return this.sendSecurityAlert(enhancedAlert);
  }

  /**
   * Send batch of security events (for multiple warnings)
   */
  sendBatchAlerts(alerts: SecurityAlert[]): Observable<AlertResponse> {
    return this.http.post<AlertResponse>(`${this.baseUrl}/api/security/alerts/batch`, {
      alerts: alerts,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to incoming security alerts (for admin/psychologist dashboard)
   */
  getSecurityAlerts(): Observable<SecurityAlert> {
    return this.alertsSubject.asObservable();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  /**
   * Get recent security alerts for a specific test attempt
   */
  getAlertHistory(attemptId: string): Observable<SecurityAlert[]> {
    return this.http.get<SecurityAlert[]>(`${this.baseUrl}/api/security/alerts/attempt/${attemptId}`);
  }

  /**
   * Get active security alerts for all ongoing tests
   */
  getActiveAlerts(): Observable<SecurityAlert[]> {
    return this.http.get<SecurityAlert[]>(`${this.baseUrl}/api/security/alerts/active`);
  }

  /**
   * Mark alert as acknowledged by psychologist
   */
  acknowledgeAlert(alertId: string, psychologistId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/api/security/alerts/${alertId}/acknowledge`, {
      psychologistId,
      acknowledgedAt: new Date().toISOString()
    });
  }

  /**
   * Request immediate intervention for a test attempt
   */
  requestIntervention(attemptId: string, reason: string, psychologistId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/security/intervention`, {
      attemptId,
      reason,
      psychologistId,
      timestamp: new Date().toISOString(),
      type: 'IMMEDIATE_INTERVENTION'
    });
  }

  /**
   * Cleanup WebSocket connection
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.connectionStatus.next(false);
  }
  /**
   * Helper method to determine alert severity based on violation type and count
   */
  static determineSeverity(alertType: SecurityAlert['alertType'], warningCount: number, maxWarnings: number): SecurityAlert['severity'] {
    switch (alertType) {
      case 'TEST_SUBMITTED_VIOLATION':
        return 'CRITICAL'; // Only test submission is critical
      
      case 'TAB_SWITCH':
        if (warningCount >= maxWarnings) return 'CRITICAL'; // Only when auto-submitting
        if (warningCount >= maxWarnings - 2) return 'MEDIUM'; // Near the limit
        return 'LOW'; // Most tab switches are low severity
      
      case 'DEVTOOLS_DETECTED':
      case 'SCREENSHOT_ATTEMPT':
      case 'COPY_PASTE':
        return 'LOW'; // Reduced from HIGH/CRITICAL to LOW
      
      case 'RIGHT_CLICK':
      case 'RAPID_FOCUS_CHANGE':
      case 'NAVIGATION_ATTEMPT':
        return 'LOW'; // All reduced to LOW
      
      default:
        return 'LOW';
    }
  }

  /**
   * Create standardized alert object
   */  static createAlert(
    attemptId: string,
    testId: string,
    candidateId: string,
    alertType: SecurityAlert['alertType'],
    description: string,
    questionIndex: number,
    additionalData?: any,
    warningCount?: number,
    maxWarnings?: number
  ): SecurityAlert {
    return {
      attemptId,
      testId,
      candidateId,
      candidateName: additionalData?.candidateName || 'Unknown Candidate',
      alertType,
      severity: this.determineSeverity(alertType, warningCount || 0, maxWarnings || 10),
      description,
      timestamp: new Date().toISOString(),
      questionIndex,
      userAgent: navigator.userAgent,
      additionalData,
      warningCount,
      maxWarnings
    };
  }
}
