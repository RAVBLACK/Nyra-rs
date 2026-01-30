// Safe Haven Service - Crowdsourced Safety Map
// Manages safe spots, danger zones, and crowd-sourced safety information
// Handles both frontend map display and backend data aggregation

import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from './locationService';

class SafeHavenService {
  constructor() {
    this.isActive = false;
    this.safeHavens = [];
    this.dangerZones = [];
    this.userReports = [];
    this.listeners = [];
    this.lastLocationUpdate = null;
    this.nearbyHavensRadius = 2000; // 2km default radius
    this.autoUpdateInterval = null;
  }

  // ====== FRONTEND FUNCTIONALITY ======

  /**
   * Initialize safe haven service with user preferences
   * @param {Object} config - Service configuration
   * @param {number} config.searchRadius - Radius to search for safe havens (meters)
   * @param {boolean} config.autoUpdate - Whether to auto-update based on location
   * @param {Array} config.preferredTypes - Preferred types of safe havens
   * @param {boolean} config.crowdsourcedData - Whether to include user reports
   */
  async initializeSafeHavenService(config) {
    try {
      const safeHavenConfig = {
        searchRadius: config.searchRadius || 2000,
        autoUpdate: config.autoUpdate !== false,
        preferredTypes: config.preferredTypes || ['police', 'hospital', 'store24h', 'transit'],
        crowdsourcedData: config.crowdsourcedData !== false,
        showDangerZones: config.showDangerZones !== false,
        realTimeUpdates: config.realTimeUpdates !== false
      };

      await AsyncStorage.setItem('safe_haven_config', JSON.stringify(safeHavenConfig));
      
      this.nearbyHavensRadius = safeHavenConfig.searchRadius;
      this.isActive = true;

      // Load initial data
      await this.loadInitialData();

      // Start location-based updates if enabled
      if (safeHavenConfig.autoUpdate) {
        await this.startLocationBasedUpdates();
      }

      // FRONTEND: Update UI
      this.notifyListeners('safeHavenInitialized', {
        config: safeHavenConfig,
        safeHavensCount: this.safeHavens.length,
        dangerZonesCount: this.dangerZones.length
      });

      return { success: true, config: safeHavenConfig };
    } catch (error) {
      console.error('Failed to initialize safe haven service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get safe havens and danger zones near a location
   * @param {Object} location - Location coordinates
   * @param {number} radius - Search radius in meters
   * @param {Array} types - Types of safe havens to include
   */
  async getNearbyPlaces(location, radius = null, types = null) {
    try {
      const searchRadius = radius || this.nearbyHavensRadius;
      const searchTypes = types || ['all'];

      // Get data from multiple sources
      const [officialPlaces, crowdsourcedPlaces, dangerZones] = await Promise.all([
        this.getOfficialSafeHavens(location, searchRadius, searchTypes),
        this.getCrowdsourcedPlaces(location, searchRadius),
        this.getDangerZones(location, searchRadius)
      ]);

      const result = {
        safeHavens: [...officialPlaces, ...crowdsourcedPlaces],
        dangerZones: dangerZones,
        location: location,
        searchRadius: searchRadius,
        lastUpdated: new Date()
      };

      // FRONTEND: Update UI with new data
      this.notifyListeners('nearbyPlacesUpdated', result);

      return result;
    } catch (error) {
      console.error('Failed to get nearby places:', error);
      return {
        safeHavens: [],
        dangerZones: [],
        error: error.message
      };
    }
  }

  /**
   * Submit a new safe haven or danger zone report
   * @param {Object} report - User report data
   * @param {Object} report.location - Location coordinates
   * @param {string} report.type - 'safe_haven' or 'danger_zone'
   * @param {string} report.category - Category of place/threat
   * @param {string} report.description - User description
   * @param {number} report.rating - Safety rating (1-10)
   * @param {Array} report.amenities - Available amenities (for safe havens)
   * @param {string} report.hours - Operating hours (for safe havens)
   */
  async submitSafetyReport(report) {
    try {
      const safetyReport = {
        id: Date.now(),
        userId: await this.getUserId(),
        location: report.location,
        type: report.type,
        category: report.category,
        description: report.description,
        rating: report.rating,
        amenities: report.amenities || [],
        hours: report.hours || '',
        timestamp: new Date(),
        verified: false,
        votes: { helpful: 0, notHelpful: 0 },
        status: 'pending_verification'
      };

      // Store locally
      const reports = await AsyncStorage.getItem('safety_reports');
      const reportArray = reports ? JSON.parse(reports) : [];
      reportArray.push(safetyReport);
      await AsyncStorage.setItem('safety_reports', JSON.stringify(reportArray));

      // Add to appropriate array
      if (report.type === 'safe_haven') {
        this.safeHavens.push(safetyReport);
      } else if (report.type === 'danger_zone') {
        this.dangerZones.push(safetyReport);
      }

      // BACKEND: Submit to server for verification
      await this.submitReportToBackend(safetyReport);

      // FRONTEND: Update UI
      this.notifyListeners('reportSubmitted', {
        report: safetyReport,
        type: report.type
      });

      // Log submission
      await this.logSafeHavenEvent('report_submitted', {
        reportId: safetyReport.id,
        type: report.type,
        category: report.category
      });

      return { success: true, reportId: safetyReport.id };
    } catch (error) {
      console.error('Failed to submit safety report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vote on the helpfulness of a safety report
   * @param {string} reportId - ID of the report to vote on
   * @param {string} voteType - 'helpful' or 'not_helpful'
   */
  async voteOnReport(reportId, voteType) {
    try {
      const vote = {
        reportId: reportId,
        userId: await this.getUserId(),
        voteType: voteType,
        timestamp: new Date()
      };

      // Store vote locally
      const votes = await AsyncStorage.getItem('report_votes');
      const voteArray = votes ? JSON.parse(votes) : [];
      
      // Check if user already voted on this report
      const existingVote = voteArray.find(v => v.reportId === reportId && v.userId === vote.userId);
      if (existingVote) {
        return { success: false, error: 'Already voted on this report' };
      }

      voteArray.push(vote);
      await AsyncStorage.setItem('report_votes', JSON.stringify(voteArray));

      // BACKEND: Submit vote to server
      await this.submitVoteToBackend(vote);

      // FRONTEND: Update UI
      this.notifyListeners('voteSubmitted', {
        reportId: reportId,
        voteType: voteType
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to vote on report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get navigation directions to nearest safe haven
   * @param {Object} currentLocation - Current location coordinates
   * @param {string} preferredType - Preferred type of safe haven
   * @param {string} urgency - 'low', 'medium', 'high' - affects selection criteria
   */
  async getDirectionsToNearestSafeHaven(currentLocation, preferredType = null, urgency = 'medium') {
    try {
      // Get nearby safe havens
      const nearbyPlaces = await this.getNearbyPlaces(currentLocation, this.nearbyHavensRadius);
      
      if (nearbyPlaces.safeHavens.length === 0) {
        return { success: false, error: 'No safe havens found nearby' };
      }

      // Filter by preferred type if specified
      let filteredHavens = nearbyPlaces.safeHavens;
      if (preferredType) {
        filteredHavens = nearbyPlaces.safeHavens.filter(haven => 
          haven.category === preferredType || haven.amenities?.includes(preferredType)
        );
      }

      // Sort by urgency criteria
      const sortedHavens = this.sortHavensByUrgency(filteredHavens, currentLocation, urgency);
      const nearestHaven = sortedHavens[0];

      if (!nearestHaven) {
        return { success: false, error: 'No suitable safe haven found' };
      }

      // TODO: Get actual directions using Maps API
      const directions = await this.getDirections(currentLocation, nearestHaven.location);

      const result = {
        destination: nearestHaven,
        directions: directions,
        distance: this.calculateDistance(currentLocation, nearestHaven.location),
        estimatedTime: directions.estimatedTime,
        urgency: urgency
      };

      // FRONTEND: Update UI with directions
      this.notifyListeners('directionsGenerated', result);

      // Log navigation request
      await this.logSafeHavenEvent('navigation_requested', {
        destinationId: nearestHaven.id,
        urgency: urgency,
        distance: result.distance
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to get directions to safe haven:', error);
      return { success: false, error: error.message };
    }
  }

  // ====== BACKEND DATA SOURCES ======

  /**
   * Get official safe havens from authoritative sources
   * @param {Object} location - Location coordinates
   * @param {number} radius - Search radius
   * @param {Array} types - Types of places to search for
   */
  async getOfficialSafeHavens(location, radius, types) {
    try {
      // TODO: Integrate with multiple APIs:
      // - Google Places API for 24/7 stores, hospitals
      // - Government APIs for police stations, fire departments
      // - Transit APIs for train/bus stations
      // - Local government APIs for emergency shelters

      // Mock official data for now
      const mockOfficialPlaces = [
        {
          id: 'official_1',
          name: '24/7 Convenience Store',
          category: 'store24h',
          location: {
            latitude: location.latitude + 0.005,
            longitude: location.longitude + 0.005
          },
          address: '123 Main St',
          phone: '+1234567890',
          hours: '24/7',
          amenities: ['restroom', 'food', 'phone', 'well_lit'],
          verificationStatus: 'verified',
          lastVerified: new Date(Date.now() - 86400000), // 1 day ago
          source: 'google_places',
          rating: 4.2,
          trustScore: 9.5
        },
        {
          id: 'official_2',
          name: 'Metro Police Station',
          category: 'police',
          location: {
            latitude: location.latitude - 0.008,
            longitude: location.longitude + 0.003
          },
          address: '456 Oak Ave',
          phone: '+1987654321',
          hours: '24/7',
          amenities: ['emergency_services', 'safe_zone', 'parking'],
          verificationStatus: 'verified',
          lastVerified: new Date(Date.now() - 86400000),
          source: 'government_api',
          rating: 5.0,
          trustScore: 10.0
        }
      ];

      // Filter by distance
      return mockOfficialPlaces.filter(place => 
        this.calculateDistance(location, place.location) <= radius
      );
    } catch (error) {
      console.error('Failed to get official safe havens:', error);
      return [];
    }
  }

  /**
   * Get crowdsourced places from user reports
   * @param {Object} location - Location coordinates
   * @param {number} radius - Search radius
   */
  async getCrowdsourcedPlaces(location, radius) {
    try {
      const reports = await AsyncStorage.getItem('safety_reports');
      const reportArray = reports ? JSON.parse(reports) : [];

      // Filter for safe havens within radius
      const nearbyCrowdsourced = reportArray
        .filter(report => 
          report.type === 'safe_haven' && 
          report.status === 'verified' &&
          this.calculateDistance(location, report.location) <= radius
        )
        .map(report => ({
          ...report,
          source: 'crowdsourced',
          trustScore: this.calculateCrowdsourcedTrustScore(report)
        }));

      return nearbyCrowdsourced;
    } catch (error) {
      console.error('Failed to get crowdsourced places:', error);
      return [];
    }
  }

  /**
   * Get danger zones from user reports and official sources
   * @param {Object} location - Location coordinates  
   * @param {number} radius - Search radius
   */
  async getDangerZones(location, radius) {
    try {
      const [userReports, officialData] = await Promise.all([
        this.getCrowdsourcedDangerZones(location, radius),
        this.getOfficialDangerZones(location, radius)
      ]);

      return [...userReports, ...officialData];
    } catch (error) {
      console.error('Failed to get danger zones:', error);
      return [];
    }
  }

  /**
   * Get crowdsourced danger zones from user reports
   */
  async getCrowdsourcedDangerZones(location, radius) {
    try {
      const reports = await AsyncStorage.getItem('safety_reports');
      const reportArray = reports ? JSON.parse(reports) : [];

      return reportArray
        .filter(report => 
          report.type === 'danger_zone' && 
          report.status === 'verified' &&
          this.calculateDistance(location, report.location) <= radius
        )
        .map(report => ({
          ...report,
          source: 'crowdsourced',
          threatLevel: this.calculateThreatLevel(report)
        }));
    } catch (error) {
      console.error('Failed to get crowdsourced danger zones:', error);
      return [];
    }
  }

  /**
   * Get official danger zones from crime data and authorities
   */
  async getOfficialDangerZones(location, radius) {
    try {
      // TODO: Integrate with:
      // - Police crime databases
      // - City planning data (poor lighting areas)
      // - Weather/disaster alert APIs
      // - Construction/road closure APIs

      // Mock official danger data
      const mockDangerZones = [
        {
          id: 'danger_1',
          name: 'Construction Zone',
          category: 'construction',
          location: {
            latitude: location.latitude + 0.003,
            longitude: location.longitude - 0.007
          },
          description: 'Active construction site - poor lighting',
          threatLevel: 'medium',
          source: 'city_planning',
          validUntil: new Date(Date.now() + 2592000000), // 30 days
          verified: true
        }
      ];

      return mockDangerZones.filter(zone => 
        this.calculateDistance(location, zone.location) <= radius
      );
    } catch (error) {
      console.error('Failed to get official danger zones:', error);
      return [];
    }
  }

  /**
   * Load initial cached data for offline usage
   */
  async loadInitialData() {
    try {
      const [cachedHavens, cachedDangerZones, cachedReports] = await Promise.all([
        AsyncStorage.getItem('cached_safe_havens'),
        AsyncStorage.getItem('cached_danger_zones'),
        AsyncStorage.getItem('safety_reports')
      ]);

      this.safeHavens = cachedHavens ? JSON.parse(cachedHavens) : [];
      this.dangerZones = cachedDangerZones ? JSON.parse(cachedDangerZones) : [];
      this.userReports = cachedReports ? JSON.parse(cachedReports) : [];

      console.log(`Loaded ${this.safeHavens.length} safe havens and ${this.dangerZones.length} danger zones from cache`);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  /**
   * Start location-based automatic updates
   */
  async startLocationBasedUpdates() {
    try {
      this.autoUpdateInterval = setInterval(async () => {
        try {
          const currentLocation = await locationService.getCurrentLocation();
          
          // Check if user moved significantly
          if (this.lastLocationUpdate) {
            const distance = this.calculateDistance(currentLocation, this.lastLocationUpdate);
            if (distance < 500) return; // Don't update if moved less than 500m
          }

          this.lastLocationUpdate = currentLocation;
          
          // Get updated data for new location
          await this.getNearbyPlaces(currentLocation);
          
        } catch (error) {
          console.error('Auto-update failed:', error);
        }
      }, 300000); // Update every 5 minutes
    } catch (error) {
      console.error('Failed to start location-based updates:', error);
    }
  }

  /**
   * BACKEND: Submit report to server for verification
   */
  async submitReportToBackend(report) {
    try {
      // TODO: Implement API call to submit report
      // This would include moderation and verification workflows
      
      console.log('Submitting report to backend:', report.id);
      
      // Mock server response
      return { success: true, status: 'pending_verification' };
    } catch (error) {
      console.error('Failed to submit report to backend:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * BACKEND: Submit vote to server
   */
  async submitVoteToBackend(vote) {
    try {
      // TODO: Implement API call to submit vote
      console.log('Submitting vote to backend:', vote);
      return { success: true };
    } catch (error) {
      console.error('Failed to submit vote to backend:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(startLocation, endLocation) {
    try {
      // TODO: Integrate with Google Directions API or similar
      // For now, return mock directions
      
      const distance = this.calculateDistance(startLocation, endLocation);
      const estimatedTime = Math.ceil(distance / 80); // Rough walking time in minutes
      
      return {
        distance: distance,
        estimatedTime: estimatedTime,
        steps: [
          { instruction: 'Head north on current street', distance: distance * 0.3 },
          { instruction: 'Turn right at the intersection', distance: distance * 0.4 },
          { instruction: 'Continue straight to destination', distance: distance * 0.3 }
        ],
        polyline: null // Would contain encoded polyline for map display
      };
    } catch (error) {
      console.error('Failed to get directions:', error);
      return null;
    }
  }

  // ====== UTILITY METHODS ======

  /**
   * Sort safe havens by urgency criteria
   */
  sortHavensByUrgency(havens, currentLocation, urgency) {
    return havens.sort((a, b) => {
      const distanceA = this.calculateDistance(currentLocation, a.location);
      const distanceB = this.calculateDistance(currentLocation, b.location);
      
      let scoreA = 0;
      let scoreB = 0;

      switch (urgency) {
        case 'high':
          // Prioritize police stations and hospitals, then distance
          if (a.category === 'police' || a.category === 'hospital') scoreA += 1000;
          if (b.category === 'police' || b.category === 'hospital') scoreB += 1000;
          scoreA -= distanceA;
          scoreB -= distanceB;
          break;
        case 'medium':
          // Balance between safety rating and distance
          scoreA = (a.trustScore || 5) * 100 - distanceA;
          scoreB = (b.trustScore || 5) * 100 - distanceB;
          break;
        case 'low':
          // Prioritize user preferences and ratings
          scoreA = (a.rating || 3) * 200 + (a.trustScore || 5) * 100 - distanceA;
          scoreB = (b.rating || 3) * 200 + (b.trustScore || 5) * 100 - distanceB;
          break;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Calculate trust score for crowdsourced content
   */
  calculateCrowdsourcedTrustScore(report) {
    let score = 5.0; // Base score
    
    // Adjust based on votes
    const totalVotes = report.votes.helpful + report.votes.notHelpful;
    if (totalVotes > 0) {
      const helpfulRatio = report.votes.helpful / totalVotes;
      score = 1 + (helpfulRatio * 9); // Scale to 1-10
    }
    
    // Adjust based on age of report
    const ageInDays = (new Date() - new Date(report.timestamp)) / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) score *= 0.7; // Reduce for old reports
    
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Calculate threat level for danger zones
   */
  calculateThreatLevel(report) {
    const severityMap = {
      1: 'very_low', 2: 'very_low', 3: 'low', 4: 'low',
      5: 'medium', 6: 'medium', 7: 'high', 8: 'high',
      9: 'very_high', 10: 'very_high'
    };
    
    return severityMap[report.rating] || 'medium';
  }

  calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude-point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude-point1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * BACKEND: Log safe haven events
   */
  async logSafeHavenEvent(eventType, data) {
    try {
      const logEntry = {
        eventType,
        timestamp: new Date(),
        data,
        deviceId: await this.getDeviceId(),
        userId: await this.getUserId()
      };

      // Store locally
      const logs = await AsyncStorage.getItem('safe_haven_logs');
      const logArray = logs ? JSON.parse(logs) : [];
      logArray.push(logEntry);
      await AsyncStorage.setItem('safe_haven_logs', JSON.stringify(logArray));

      // TODO: Send to backend API
      
    } catch (error) {
      console.error('Failed to log safe haven event:', error);
    }
  }

  // FRONTEND: Subscribe to service events
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // FRONTEND: Notify UI components
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  async getDeviceId() {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Date.now().toString() + Math.random().toString(36);
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async getUserId() {
    return await AsyncStorage.getItem('user_id') || 'anonymous';
  }

  // FRONTEND: Get current data
  getSafeHavens() { return this.safeHavens; }
  getDangerZones() { return this.dangerZones; }
  getIsActive() { return this.isActive; }

  // Clean up
  cleanup() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
    }
    this.isActive = false;
  }
}

// Export singleton instance
export const safeHavenService = new SafeHavenService();
export default safeHavenService;

// TODO: Backend API Endpoints:
// - GET /api/safe-havens/nearby
// - POST /api/safe-havens/report
// - POST /api/safe-havens/vote
// - GET /api/safe-havens/official-sources
// - GET /api/danger-zones/nearby
// - POST /api/safe-havens/verify
// - GET /api/safe-havens/directions

// TODO: Data Source Integrations:
// - Google Places API for official businesses
// - Government APIs for public safety facilities
// - Transit APIs for stations and stops
// - Crime databases for danger zone identification
// - Weather/disaster APIs for temporary hazards
// - City planning APIs for lighting and infrastructure data

// TODO: Required Dependencies:
// - @react-native-async-storage/async-storage
// - react-native-maps for map display
// - Google Maps/Directions API integration
// - Background location services