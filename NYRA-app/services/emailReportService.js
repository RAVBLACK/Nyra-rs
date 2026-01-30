// Email Report Service
// Automated emergency reporting via email with evidence attachments

import AsyncStorage from '@react-native-async-storage/async-storage';

class EmailReportService {
  static instance = null;
  
  constructor() {
    this.isConfigured = false;
    this.reportQueue = [];
    this.sentReports = [];
    this.listeners = new Map();
    
    // Email configuration
    this.emailConfig = {
      smtpServer: '',
      smtpPort: 587,
      username: '',
      password: '',
      fromEmail: '',
      encryptionMethod: 'TLS', // TLS, SSL, None
      authRequired: true
    };
    
    // Report templates
    this.templates = {
      emergency_alert: {
        subject: '🚨 EMERGENCY ALERT - {location}',
        priority: 'high',
        template: `
EMERGENCY ALERT - IMMEDIATE ASSISTANCE REQUIRED

Time: {timestamp}
Location: {location}
Emergency Type: {type}
Description: {description}

CONTACT INFORMATION:
Name: {userName}
Phone: {userPhone}
Emergency Contacts: {emergencyContacts}

DEVICE INFORMATION:
Device ID: {deviceId}
Battery Level: {batteryLevel}
Signal Strength: {signalStrength}

EVIDENCE ATTACHED:
{evidenceList}

This is an automated emergency alert from the NYRA Safety App.
Please respond immediately or contact local emergency services.

Emergency Services: 911 (US), 112 (EU), {localEmergencyNumber}
        `
      },
      fall_detection: {
        subject: '🏥 FALL DETECTED - {userName}',
        priority: 'high',
        template: `
FALL DETECTION ALERT

A fall has been detected for {userName}.

Time: {timestamp}
Location: {location}
Fall Confidence: {confidence}%
Response Time: {responseTime} seconds

ACTIVITY CONTEXT:
Previous Activity: {previousActivity}
Activity at Fall: {fallActivity}
Movement After Fall: {postFallMovement}

EVIDENCE ATTACHED:
{evidenceList}

Please check on {userName} immediately.
        `
      },
      threat_detection: {
        subject: '⚠️ THREAT DETECTED - {location}',
        priority: 'high',
        template: `
SECURITY THREAT DETECTED

Multiple threats have been identified in the area.

Time: {timestamp}
Location: {location}
Threat Level: {threatLevel}
Detected Threats: {threatTypes}

THREAT DETAILS:
{threatDetails}

EVIDENCE ATTACHED:
{evidenceList}

Please avoid this area or take immediate safety precautions.
        `
      },
      community_emergency: {
        subject: '🛡️ COMMUNITY EMERGENCY - {location}',
        priority: 'high',
        template: `
COMMUNITY EMERGENCY ASSISTANCE REQUEST

A community member has requested emergency assistance.

Time: {timestamp}
Location: {location}
Request Type: {requestType}
Description: {description}

REQUESTER INFORMATION:
{requesterInfo}

RESPONSE STATUS:
Helpers Notified: {helpersNotified}
Estimated Response Time: {estimatedResponseTime}

Please respond if you are in the area and able to assist safely.
        `
      },
      daily_summary: {
        subject: '📊 NYRA Safety Summary - {date}',
        priority: 'normal',
        template: `
DAILY SAFETY SUMMARY

Date: {date}
User: {userName}

ACTIVITY SUMMARY:
Total Activities: {totalActivities}
Most Common Activity: {mostCommonActivity}
Safety Score: {safetyScore}/10

ALERTS TODAY:
Emergency Alerts: {emergencyAlerts}
Fall Alerts: {fallAlerts}
Threat Alerts: {threatAlerts}
Community Requests: {communityRequests}

LOCATION SUMMARY:
Safe Haven Visits: {safeHavenVisits}
High-Risk Areas: {highRiskAreas}
Travel Distance: {travelDistance}

All data is securely stored and encrypted.
        `
      }
    };
    
    // Recipients configuration
    this.recipients = {
      emergency_contacts: [],
      family_members: [],
      authorities: [],
      medical_contacts: [],
      custom_recipients: []
    };
    
    this.init();
  }
  
  static getInstance() {
    if (!EmailReportService.instance) {
      EmailReportService.instance = new EmailReportService();
    }
    return EmailReportService.instance;
  }
  
  async init() {
    await this.loadSettings();
    this.setupEventListeners();
  }
  
  // Event subscription system
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Email service listener error:', error);
      }
    });
  }
  
  async loadSettings() {
    try {
      // Load email configuration
      const emailSettings = await AsyncStorage.getItem('emailServiceSettings');
      if (emailSettings) {
        const parsed = JSON.parse(emailSettings);
        this.emailConfig = { ...this.emailConfig, ...parsed };
      }
      
      // Load recipients
      const recipientSettings = await AsyncStorage.getItem('emailRecipients');
      if (recipientSettings) {
        const parsed = JSON.parse(recipientSettings);
        this.recipients = { ...this.recipients, ...parsed };
      }
      
      // Load custom templates
      const templateSettings = await AsyncStorage.getItem('emailTemplates');
      if (templateSettings) {
        const parsed = JSON.parse(templateSettings);
        this.templates = { ...this.templates, ...parsed };
      }
      
      this.isConfigured = this.validateConfiguration();
      
    } catch (error) {
      console.error('Failed to load email settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await AsyncStorage.setItem('emailServiceSettings', JSON.stringify(this.emailConfig));
      await AsyncStorage.setItem('emailRecipients', JSON.stringify(this.recipients));
      await AsyncStorage.setItem('emailTemplates', JSON.stringify(this.templates));
    } catch (error) {
      console.error('Failed to save email settings:', error);
    }
  }
  
  validateConfiguration() {
    return !!(
      this.emailConfig.smtpServer &&
      this.emailConfig.username &&
      this.emailConfig.password &&
      this.emailConfig.fromEmail
    );
  }
  
  setupEventListeners() {
    this.emit('serviceReady', { 
      isReady: true,
      isConfigured: this.isConfigured 
    });
  }
  
  // Email configuration methods
  async configureEmailSettings(config) {
    this.emailConfig = { ...this.emailConfig, ...config };
    this.isConfigured = this.validateConfiguration();
    await this.saveSettings();
    
    this.emit('configurationUpdated', {
      isConfigured: this.isConfigured,
      config: this.emailConfig
    });
    
    return this.isConfigured;
  }
  
  async addRecipient(type, recipientData) {
    if (!this.recipients[type]) {
      this.recipients[type] = [];
    }
    
    const recipient = {
      id: `recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...recipientData,
      addedAt: Date.now()
    };
    
    this.recipients[type].push(recipient);
    await this.saveSettings();
    
    this.emit('recipientAdded', { type, recipient });
    
    return recipient.id;
  }
  
  async removeRecipient(type, recipientId) {
    if (this.recipients[type]) {
      this.recipients[type] = this.recipients[type].filter(
        recipient => recipient.id !== recipientId
      );
      await this.saveSettings();
      
      this.emit('recipientRemoved', { type, recipientId });
    }
  }
  
  // Email sending methods
  async sendEmergencyAlert(alertData) {
    const reportData = {
      type: 'emergency_alert',
      priority: 'high',
      recipients: [
        ...this.recipients.emergency_contacts,
        ...this.recipients.authorities
      ],
      data: alertData,
      attachments: await this.gatherEvidence(alertData),
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendFallAlert(fallData) {
    const reportData = {
      type: 'fall_detection',
      priority: 'high',
      recipients: [
        ...this.recipients.emergency_contacts,
        ...this.recipients.medical_contacts
      ],
      data: fallData,
      attachments: await this.gatherEvidence(fallData),
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendThreatAlert(threatData) {
    const reportData = {
      type: 'threat_detection',
      priority: 'high',
      recipients: [
        ...this.recipients.emergency_contacts,
        ...this.recipients.family_members
      ],
      data: threatData,
      attachments: await this.gatherEvidence(threatData),
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendCommunityEmergency(communityData) {
    const reportData = {
      type: 'community_emergency',
      priority: 'high',
      recipients: [
        ...this.recipients.emergency_contacts,
        ...this.recipients.family_members
      ],
      data: communityData,
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendDailySummary(summaryData) {
    const reportData = {
      type: 'daily_summary',
      priority: 'normal',
      recipients: this.recipients.family_members,
      data: summaryData,
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendCustomReport(templateType, recipients, data, attachments = []) {
    const reportData = {
      type: templateType,
      priority: 'normal',
      recipients,
      data,
      attachments,
      timestamp: Date.now()
    };
    
    return await this.sendReport(reportData);
  }
  
  async sendReport(reportData) {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }
      
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate email content
      const emailContent = await this.generateEmailContent(reportData);
      
      // Add to queue
      const queuedReport = {
        id: reportId,
        ...reportData,
        content: emailContent,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3
      };
      
      this.reportQueue.push(queuedReport);
      
      // Process immediately for high priority
      if (reportData.priority === 'high') {
        await this.processQueue();
      }
      
      this.emit('reportQueued', { reportId, type: reportData.type });
      
      return reportId;
      
    } catch (error) {
      console.error('Failed to send report:', error);
      this.emit('reportError', { error: error.message, reportData });
      throw error;
    }
  }
  
  async generateEmailContent(reportData) {
    const template = this.templates[reportData.type];
    if (!template) {
      throw new Error(`Template not found for type: ${reportData.type}`);
    }
    
    // Replace placeholders in template
    let subject = template.subject;
    let body = template.template;
    
    // TODO: Get user data
    const userData = {
      userName: 'User',
      userPhone: '+1234567890',
      deviceId: 'device_123'
    };
    
    // Replace common placeholders
    const replacements = {
      ...reportData.data,
      ...userData,
      timestamp: new Date(reportData.timestamp).toLocaleString(),
      date: new Date().toLocaleDateString(),
      evidenceList: this.formatEvidenceList(reportData.attachments || []),
      emergencyContacts: this.formatEmergencyContacts()
    };
    
    // Replace all placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value || 'N/A');
      body = body.replace(new RegExp(placeholder, 'g'), value || 'N/A');
    });
    
    return {
      subject,
      body,
      priority: template.priority
    };
  }
  
  formatEvidenceList(attachments) {
    if (!attachments || attachments.length === 0) {
      return 'No evidence attachments';
    }
    
    return attachments.map((attachment, index) => 
      `${index + 1}. ${attachment.name} (${attachment.type}) - ${attachment.size}`
    ).join('\n');
  }
  
  formatEmergencyContacts() {
    return this.recipients.emergency_contacts
      .map(contact => `${contact.name} (${contact.email})`)
      .join(', ') || 'No emergency contacts configured';
  }
  
  async gatherEvidence(eventData) {
    const attachments = [];
    
    try {
      // TODO: Integrate with evidence capture service
      // const evidenceService = require('./evidenceCaptureService').default.getInstance();
      // const evidenceFiles = await evidenceService.getRecentEvidence(eventData.timestamp);
      
      // TODO: Attach location data
      // attachments.push({
      //   name: 'location_data.json',
      //   type: 'application/json',
      //   data: JSON.stringify(eventData.location),
      //   size: '1KB'
      // });
      
      // TODO: Attach device telemetry
      // attachments.push({
      //   name: 'device_telemetry.json',
      //   type: 'application/json',
      //   data: JSON.stringify(await this.getDeviceTelemetry()),
      //   size: '2KB'
      // });
      
    } catch (error) {
      console.error('Failed to gather evidence:', error);
    }
    
    return attachments;
  }
  
  async processQueue() {
    if (this.reportQueue.length === 0) return;
    
    const pendingReports = this.reportQueue.filter(
      report => report.status === 'queued'
    );
    
    for (const report of pendingReports) {
      try {
        await this.sendSingleEmail(report);
        
        // Mark as sent
        report.status = 'sent';
        report.sentAt = Date.now();
        
        // Move to sent reports
        this.sentReports.push(report);
        
        // Remove from queue
        this.reportQueue = this.reportQueue.filter(r => r.id !== report.id);
        
        this.emit('reportSent', { 
          reportId: report.id, 
          type: report.type,
          sentTo: report.recipients.length
        });
        
      } catch (error) {
        console.error('Failed to send email:', error);
        
        report.retryCount++;
        if (report.retryCount >= report.maxRetries) {
          report.status = 'failed';
          this.emit('reportFailed', { 
            reportId: report.id, 
            error: error.message 
          });
        } else {
          report.status = 'retry';
          setTimeout(() => {
            report.status = 'queued';
          }, 5000 * report.retryCount); // Exponential backoff
        }
      }
    }
  }
  
  async sendSingleEmail(report) {
    // TODO: Implement actual email sending
    // Use a React Native email library or SMTP service
    
    // For now, simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // TODO: Real implementation would use something like:
    // import { Mailer } from 'react-native-mail';
    // 
    // await Mailer.mail({
    //   subject: report.content.subject,
    //   recipients: report.recipients.map(r => r.email),
    //   body: report.content.body,
    //   isHTML: false,
    //   attachments: report.attachments
    // });
    
    console.log('Email sent:', {
      to: report.recipients.map(r => r.email),
      subject: report.content.subject
    });
  }
  
  // Queue management
  async scheduleReport(reportData, scheduleTime) {
    const delay = scheduleTime - Date.now();
    
    if (delay <= 0) {
      return await this.sendReport(reportData);
    }
    
    const scheduledReport = {
      ...reportData,
      scheduledFor: scheduleTime,
      status: 'scheduled'
    };
    
    setTimeout(async () => {
      try {
        await this.sendReport(reportData);
      } catch (error) {
        console.error('Failed to send scheduled report:', error);
      }
    }, delay);
    
    this.emit('reportScheduled', { 
      scheduleTime, 
      type: reportData.type 
    });
    
    return scheduledReport.id;
  }
  
  // Status and management methods
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      queueSize: this.reportQueue.length,
      sentReports: this.sentReports.length,
      failedReports: this.reportQueue.filter(r => r.status === 'failed').length,
      retryReports: this.reportQueue.filter(r => r.status === 'retry').length
    };
  }
  
  getReportHistory(limit = 50) {
    return this.sentReports.slice(-limit);
  }
  
  async clearSentReports() {
    this.sentReports = [];
    await AsyncStorage.setItem('sentReports', JSON.stringify([]));
    this.emit('historyCleared', { timestamp: Date.now() });
  }
  
  async retryFailedReports() {
    const failedReports = this.reportQueue.filter(r => r.status === 'failed');
    
    failedReports.forEach(report => {
      report.status = 'queued';
      report.retryCount = 0;
    });
    
    if (failedReports.length > 0) {
      await this.processQueue();
      this.emit('retryInitiated', { count: failedReports.length });
    }
  }
  
  // Test functionality
  async sendTestEmail(recipientEmail) {
    const testData = {
      type: 'daily_summary',
      priority: 'normal',
      recipients: [{ name: 'Test User', email: recipientEmail }],
      data: {
        date: new Date().toLocaleDateString(),
        totalActivities: 5,
        safetyScore: 8.5,
        emergencyAlerts: 0
      },
      timestamp: Date.now()
    };
    
    return await this.sendReport(testData);
  }
}

export default EmailReportService;