// Example backend service implementation for security alerts
// This would typically go in your Node.js/Express backend

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

class SecurityAlertService {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.activeAlerts = new Map();
    this.psychologistClients = new Set();
    
    this.setupRoutes();
    // WebSocket will be setup when server starts
  }
  setupRoutes() {
    // Enable CORS for all routes
    this.app.use(cors({
      origin: ['http://localhost:4200', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    this.app.use(express.json());

    // Receive security alert from test client
    this.app.post('/api/security/alerts', (req, res) => {
      const alert = {
        id: this.generateAlertId(),
        ...req.body,
        receivedAt: new Date().toISOString(),
        acknowledged: false
      };

      // Store alert
      this.activeAlerts.set(alert.id, alert);

      // Broadcast to all connected psychologists in real-time
      this.broadcastAlert(alert);

      // Log the alert
      console.log(`🚨 SECURITY ALERT: ${alert.alertType} - ${alert.description}`);
      console.log(`   Candidate: ${alert.candidateName} (${alert.candidateId})`);
      console.log(`   Test: ${alert.testId} | Question: ${alert.questionIndex + 1}`);
      console.log(`   Severity: ${alert.severity}`);

      res.json({ 
        success: true, 
        alertId: alert.id,
        message: 'Alert received and broadcasted to psychologists'
      });
    });

    // Get active alerts for dashboard
    this.app.get('/api/security/alerts/active', (req, res) => {
      const alerts = Array.from(this.activeAlerts.values())
        .filter(alert => !alert.acknowledged)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json(alerts);
    });

    // Get alert history for specific attempt
    this.app.get('/api/security/alerts/attempt/:attemptId', (req, res) => {
      const { attemptId } = req.params;
      const alerts = Array.from(this.activeAlerts.values())
        .filter(alert => alert.attemptId === attemptId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json(alerts);
    });

    // Acknowledge alert
    this.app.patch('/api/security/alerts/:alertId/acknowledge', (req, res) => {
      const { alertId } = req.params;
      const { psychologistId } = req.body;
      
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = psychologistId;
        alert.acknowledgedAt = new Date().toISOString();
        
        // Notify other psychologists that alert was acknowledged
        this.broadcastAlertUpdate(alert);
        
        res.json({ success: true, message: 'Alert acknowledged' });
      } else {
        res.status(404).json({ success: false, message: 'Alert not found' });
      }
    });

    // Request immediate intervention
    this.app.post('/api/security/intervention', (req, res) => {
      const { attemptId, reason, psychologistId } = req.body;
      
      // Create high-priority intervention alert
      const interventionAlert = {
        id: this.generateAlertId(),
        type: 'INTERVENTION_REQUEST',
        attemptId,
        reason,
        requestedBy: psychologistId,
        timestamp: new Date().toISOString(),
        priority: 'IMMEDIATE'
      };

      // Broadcast intervention request to all psychologists
      this.broadcastIntervention(interventionAlert);

      // Log intervention request
      console.log(`🚨 INTERVENTION REQUESTED for attempt ${attemptId}: ${reason}`);

      res.json({ 
        success: true, 
        message: 'Intervention request broadcasted' 
      });
    });

    // Send batch alerts
    this.app.post('/api/security/alerts/batch', (req, res) => {
      const { alerts } = req.body;
      let successCount = 0;

      alerts.forEach(alertData => {
        const alert = {
          id: this.generateAlertId(),
          ...alertData,
          receivedAt: new Date().toISOString(),
          acknowledged: false
        };

        this.activeAlerts.set(alert.id, alert);
        this.broadcastAlert(alert);
        successCount++;
      });

      res.json({ 
        success: true, 
        processed: successCount,
        message: `${successCount} alerts processed and broadcasted`
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket connection for security alerts');
      
      // Add to psychologist clients
      this.psychologistClients.add(ws);

      // Send current active alerts to new connection
      const activeAlerts = Array.from(this.activeAlerts.values())
        .filter(alert => !alert.acknowledged);
      
      ws.send(JSON.stringify({
        type: 'INITIAL_ALERTS',
        data: activeAlerts
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.psychologistClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.psychologistClients.delete(ws);
      });
    });
  }

  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'SECURITY_ALERT':
        // Real-time alert from test client
        const alert = {
          id: this.generateAlertId(),
          ...data.data,
          receivedAt: new Date().toISOString(),
          acknowledged: false
        };
        
        this.activeAlerts.set(alert.id, alert);
        this.broadcastAlert(alert);
        break;

      case 'HEARTBEAT':
        // Keep connection alive
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  broadcastAlert(alert) {
    const message = JSON.stringify({
      type: 'SECURITY_ALERT',
      data: alert
    });

    // Send to all connected psychologist clients
    this.psychologistClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    // Also trigger additional notifications for critical alerts
    if (alert.severity === 'CRITICAL') {
      this.sendCriticalAlertNotifications(alert);
    }
  }

  broadcastAlertUpdate(alert) {
    const message = JSON.stringify({
      type: 'ALERT_UPDATE',
      data: alert
    });

    this.psychologistClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastIntervention(intervention) {
    const message = JSON.stringify({
      type: 'INTERVENTION_REQUEST',
      data: intervention
    });

    this.psychologistClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  sendCriticalAlertNotifications(alert) {
    // Here you could integrate with:
    // - Email notifications
    // - SMS alerts
    // - Slack/Teams notifications
    // - Push notifications to mobile apps
    
    console.log(`📧 Sending critical alert notifications for: ${alert.alertType}`);
    
    // Example: Send email (you would use a real email service)
    // await this.emailService.sendCriticalAlert(alert);
    
    // Example: Send SMS (you would use a real SMS service)
    // await this.smsService.sendCriticalAlert(alert);
  }

  generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Cleanup old alerts (run periodically)
  cleanupOldAlerts() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [id, alert] of this.activeAlerts) {
      const alertTime = new Date(alert.timestamp);
      if (alertTime < cutoffTime && alert.acknowledged) {
        this.activeAlerts.delete(id);
      }
    }
  }  

  // Add sample alerts for testing
  addSampleAlerts() {
    const sampleAlerts = [
      {
        id: this.generateAlertId(),
        attemptId: 'attempt_001',
        testId: 'LOGICAL_REASONING_TEST_01',
        candidateId: 'candidate_123',
        candidateName: 'John Doe',
        alertType: 'TAB_SWITCH',
        severity: 'HIGH',
        description: 'Candidate switched browser tabs during test',
        timestamp: new Date().toISOString(),
        questionIndex: 5,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.100',
        warningCount: 2,
        maxWarnings: 3,
        acknowledged: false,
        receivedAt: new Date().toISOString()
      },
      {
        id: this.generateAlertId(),
        attemptId: 'attempt_002',
        testId: 'LOGICAL_REASONING_TEST_01',
        candidateId: 'candidate_456',
        candidateName: 'Jane Smith',
        alertType: 'DEVTOOLS_DETECTED',
        severity: 'CRITICAL',
        description: 'Developer tools detected - possible cheating attempt',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        questionIndex: 12,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.101',
        warningCount: 3,
        maxWarnings: 3,
        acknowledged: false,
        receivedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: this.generateAlertId(),
        attemptId: 'attempt_003',
        testId: 'LOGICAL_REASONING_TEST_02',
        candidateId: 'candidate_789',
        candidateName: 'Bob Johnson',
        alertType: 'COPY_PASTE',
        severity: 'MEDIUM',
        description: 'Copy/paste action detected',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        questionIndex: 3,
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.102',
        warningCount: 1,
        maxWarnings: 3,
        acknowledged: false,
        receivedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ];

    // Add sample alerts to the active alerts map
    sampleAlerts.forEach(alert => {
      this.activeAlerts.set(alert.id, alert);
    });

    console.log(`📝 Added ${sampleAlerts.length} sample alerts for testing`);
  }

  start(port = 5002) { // Changed default port to 5002 to avoid conflicts
    // Try to start on the specified port, if fails try alternative ports
    const tryPort = (currentPort) => {      this.server.listen(currentPort, () => {        // Create WebSocket server after HTTP server starts successfully
        this.wss = new WebSocket.Server({ server: this.server });
        this.setupWebSocket();
        
        console.log(`🚨 Security Alert Service running on port ${currentPort}`);
        console.log(`📡 WebSocket endpoint: ws://localhost:${currentPort}/security-alerts`);
        console.log(`🌐 API endpoint: http://localhost:${currentPort}/api/security/alerts`);
        console.log(`✅ Service started successfully!`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} is in use, trying port ${currentPort + 1}`);
          tryPort(currentPort + 1);
        } else {
          console.error('Server error:', err);
        }
      });
    };

    tryPort(port);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }
}

// Usage
const securityService = new SecurityAlertService();
securityService.start(5002); // Changed to port 5002

module.exports = SecurityAlertService;
