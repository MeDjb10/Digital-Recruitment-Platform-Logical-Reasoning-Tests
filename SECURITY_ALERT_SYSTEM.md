# Real-Time Security Alert System

## 🚨 Overview

This system provides real-time security monitoring and alerting for online test-taking activities. It detects and reports suspicious behavior to psychologists and administrators immediately as it occurs.

## 🔧 Architecture

### Frontend Components
- **Test Component**: Monitors minimal user behavior (primarily tab switching)
- **Security Monitor Dashboard**: Real-time dashboard for psychologists to monitor alerts
- **Alert Service**: Handles WebSocket connections and HTTP requests

### Backend Services
- **Security Alert Service**: Node.js service with WebSocket support (Port 5002)
- **Real-time Broadcasting**: Immediate alert delivery to monitoring staff
- **Alert Storage**: Persistent storage of security events

## 🚨 Alert Types

### Tab Switching (`TAB_SWITCH`)
- **Trigger**: User switches tabs or loses window focus
- **Severity**: Progressive (LOW → MEDIUM → CRITICAL)
- **Action**: Warning system with automatic test submission after 10 violations
- **Warnings**: User receives notifications every 3 violations

### Screenshot Attempts (`SCREENSHOT_ATTEMPT`)
- **Trigger**: Print Screen key or screenshot shortcuts (Ctrl+Shift+S)
- **Severity**: LOW 
- **Action**: Log attempt only (operation not blocked, minimal impact)

### Developer Tools (`DEVTOOLS_DETECTED`)
- **Trigger**: ~~F12, Ctrl+Shift+I, or window size changes~~ **DISABLED - Developer tools are now allowed**
- **Severity**: ~~CRITICAL~~ **N/A - No longer monitored**
- **Action**: ~~Immediate test submission~~ **Allowed for accessibility and debugging**

### Copy/Paste (`COPY_PASTE`)
- **Trigger**: ~~Ctrl+C, Ctrl+V, Ctrl+A, or text selection attempts~~ **DISABLED - Copy/paste now allowed**
- **Severity**: ~~MEDIUM to HIGH~~ **N/A - No longer restricted**
- **Action**: ~~Block operation and log violation~~ **Fully permitted**

### Right-Click (`RIGHT_CLICK`)
- **Trigger**: ~~Context menu attempts~~ **DISABLED - Right-click is now fully allowed**
- **Severity**: ~~LOW~~ **N/A - No longer monitored**
- **Action**: **Fully permitted for accessibility and user convenience**

### Navigation Attempts (`NAVIGATION_ATTEMPT`)
- **Trigger**: User tries to leave the page before test completion
- **Severity**: LOW
- **Action**: Warning and logging

### Test Submitted Due to Violation (`TEST_SUBMITTED_VIOLATION`)
- **Trigger**: Automatic test submission due to security violations
- **Severity**: CRITICAL
- **Action**: Force submission and detailed logging

## 📊 Real-Time Features

### For Test Takers
- **Progressive Warnings**: Clear, gentle feedback about violations (every 3 tab switches)
- **Security Status Indicator**: Visual indication of security state
- **Full Freedom**: Developer tools, copy/paste, right-click, and text selection are completely allowed
- **High Tolerance**: 10 tab switch warnings before auto-submission (greatly increased from 3)
- **User-Friendly**: Educational notifications instead of intimidating warnings
- **Accessibility**: No restrictions on browser developer tools or context menus

### For Psychologists/Administrators
- **Live Dashboard**: Real-time alert monitoring
- **Alert Categorization**: Severity-based filtering and prioritization
- **Intervention Tools**: Direct intervention capabilities
- **Sound Notifications**: Audio alerts for critical violations
- **Browser Notifications**: Desktop notifications for urgent alerts

## 🔄 Alert Flow

```
1. Test Taker Action → Security Detection
2. Alert Generated → Local Logging
3. Real-Time Transmission → WebSocket/HTTP
4. Backend Processing → Alert Storage
5. Live Broadcasting → Connected Psychologists
6. Dashboard Display → Visual/Audio Alerts
7. Psychologist Response → Acknowledgment/Intervention
```

## 🛠️ Implementation

### Frontend Integration

```typescript
// Example: Sending a security alert
this.sendRealtimeAlert('TAB_SWITCH', 'User switched tabs', {
  currentWarning: 1,
  totalAllowed: 3,
  timeOnQuestion: 30000
});
```

### Backend Setup

```bash
cd backend/security-alert-service
npm install
npm start
```

### Dashboard Access

```typescript
// Example: Monitoring alerts
this.securityAlertService.getSecurityAlerts().subscribe(alert => {
  this.displayAlert(alert);
  this.playAlertSound(alert.severity);
});
```

## ⚙️ Configuration

### Alert Thresholds
- **Tab Switch Warnings**: 10 (increased from 3 for better user experience)
- **Warning Frequency**: Every 3 tab switches (reduced notification frequency)
- **Alert Retention**: 24 hours
- **WebSocket Heartbeat**: 30 seconds
- **Cleanup Interval**: 1 hour

### Severity Levels
- **LOW**: Most violations (tab switching, screenshot attempts)
- **MEDIUM**: Moderate violations (frequent tab switching near limit)
- **CRITICAL**: Only test auto-submission and final violations

**Note**: Most restrictions have been removed or significantly relaxed. The system now focuses on monitoring rather than prevention.

## 🔊 Notification Channels

### Immediate Alerts
- **WebSocket**: Real-time dashboard updates
- **Browser Notifications**: Desktop alerts for critical issues
- **Sound Alerts**: Audio notifications by severity level

### Extended Notifications (Planned)
- **Email**: Critical alert summaries
- **SMS**: Emergency notifications
- **Slack/Teams**: Team notifications
- **Mobile Push**: Mobile app alerts

## 📈 Monitoring Metrics

### Real-Time Statistics
- **Active Alerts**: Current unacknowledged alerts
- **Alert Distribution**: By severity level
- **Response Times**: Psychologist response metrics
- **Test Integrity**: Security violation rates

### Historical Analytics
- **Violation Trends**: Patterns over time
- **Candidate Behavior**: Individual security profiles
- **System Performance**: Alert delivery metrics

## 🔒 Security Features

### Data Protection
- **Encrypted Transmission**: All alerts encrypted in transit
- **Access Control**: Role-based alert access
- **Audit Logging**: Complete trail of all security events
- **Data Retention**: Configurable retention policies

### Redundancy
- **Fallback Storage**: Local backup if network fails
- **Multiple Channels**: HTTP + WebSocket delivery
- **Retry Logic**: Automatic retry for failed alerts
- **Health Monitoring**: System status tracking

## 📋 Usage Instructions

### For Psychologists

1. **Access Dashboard**: Navigate to security monitor
2. **Monitor Alerts**: Watch for real-time notifications
3. **Respond to Alerts**: Acknowledge or request intervention
4. **View Details**: Access full alert information
5. **Track Patterns**: Monitor candidate behavior over time

### Alert Response Actions

- **Acknowledge**: Mark alert as seen and handled
- **Intervene**: Request immediate action for the test
- **View Details**: Access complete alert information
- **Historical Review**: Check past alerts for patterns

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- WebSocket support
- Modern browser with notifications enabled

### System Philosophy
**The system now emphasizes monitoring over prevention** with a user-friendly approach:
- **High tolerance** for normal user behavior
- **Developer-friendly** environment allowing debugging tools
- **Accessibility-focused** with unrestricted right-click and text selection
- **Educational rather than punitive** warning system

### What's Still Monitored (Active Alerts)
- **Tab Switching**: Gentle warnings every 3 switches, auto-submit after 10
- **Screenshot Attempts**: Logged but not blocked
- **Navigation Attempts**: Warning when trying to leave the page

### What's No Longer Restricted (Removed)
- **Developer Tools**: F12, Ctrl+Shift+I, window resizing - fully allowed
- **Copy/Paste Operations**: Ctrl+C, Ctrl+V, Ctrl+A, text selection - fully allowed  
- **Right-Click Context Menu**: Completely unrestricted
- **Window Resizing**: No longer monitored or restricted
- **Text Selection**: Completely allowed for accessibility

### Quick Start

1. **Start Backend Service**:
   ```bash
   cd backend/security-alert-service
   npm install
   npm start
   ```

2. **Access Monitor Dashboard**:
   - Navigate to `/dashboard/security-monitor`
   - Enable browser notifications when prompted
   - Monitor real-time alerts

3. **Test Security Features**:
   - Open a test as a candidate
   - Try tab switching (allowed up to 10 times with gentle warnings)
   - Use developer tools freely (F12, Ctrl+Shift+I - fully permitted)
   - Right-click and copy/paste freely (now allowed)
   - Observe minimal, user-friendly alerts in dashboard

## 📞 Support

For technical support or questions about the security alert system:
- Check console logs for debugging information
- Verify WebSocket connection status
- Ensure proper network connectivity
- Review alert configuration settings

## 🔄 Future Enhancements

- **Machine Learning**: Pattern recognition for advanced threat detection
- **Mobile App**: Dedicated mobile monitoring application
- **Integration APIs**: Third-party system integrations
- **Advanced Analytics**: Predictive behavior analysis
- **Multi-language Support**: Internationalization for global use
