// Safe Haven Map Component
// Frontend UI component for crowdsourced safety map feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { safeHavenService } from '../services/safeHavenService';

const SafeHavenMap = ({ style, onMapStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [safeHavens, setSafeHavens] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [config, setConfig] = useState({
    searchRadius: 2000,
    autoUpdate: true,
    preferredTypes: ['police', 'hospital', 'store24h', 'transit'],
    showDangerZones: true
  });
  const [report, setReport] = useState({
    type: 'safe_haven',
    category: 'store24h',
    description: '',
    rating: 5,
    amenities: []
  });
  const [nearestSafeHaven, setNearestSafeHaven] = useState(null);

  const safeHavenTypes = [
    { id: 'police', label: 'Police Station', emoji: '🚓' },
    { id: 'hospital', label: 'Hospital', emoji: '🏥' },
    { id: 'store24h', label: '24/7 Store', emoji: '🏪' },
    { id: 'transit', label: 'Transit Hub', emoji: '🚇' },
    { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
    { id: 'hotel', label: 'Hotel/Lobby', emoji: '🏨' }
  ];

  const dangerZoneTypes = [
    { id: 'poor_lighting', label: 'Poor Lighting', emoji: '🌑' },
    { id: 'construction', label: 'Construction', emoji: '🚧' },
    { id: 'isolated', label: 'Isolated Area', emoji: '🏚️' },
    { id: 'harassment', label: 'Harassment Reports', emoji: '⚠️' }
  ];

  const amenityOptions = [
    { id: 'restroom', label: 'Restroom' },
    { id: 'food', label: 'Food Available' },
    { id: 'phone', label: 'Phone/WiFi' },
    { id: 'well_lit', label: 'Well Lit' },
    { id: 'security', label: 'Security Guard' },
    { id: 'parking', label: 'Parking' }
  ];

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = safeHavenService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'safeHavenInitialized':
          setIsActive(true);
          onMapStateChange?.(true, data);
          break;
        case 'nearbyPlacesUpdated':
          setSafeHavens(data.safeHavens);
          setDangerZones(data.dangerZones);
          // Find nearest safe haven
          if (data.safeHavens.length > 0) {
            setNearestSafeHaven(data.safeHavens[0]); // Already sorted by distance
          }
          break;
        case 'reportSubmitted':
          showReportSubmittedAlert(data);
          break;
        case 'directionsGenerated':
          showDirectionsAlert(data);
          break;
      }
    });

    // Check if already initialized
    if (safeHavenService.getIsActive()) {
      setIsActive(true);
      setSafeHavens(safeHavenService.getSafeHavens());
      setDangerZones(safeHavenService.getDangerZones());
    }

    return unsubscribe;
  }, []);

  const showReportSubmittedAlert = (data) => {
    Alert.alert(
      '📝 Report Submitted',
      `Thank you for reporting a ${data.type.replace('_', ' ')}! Your contribution helps keep the community safe.`,
      [{ text: 'Great!' }]
    );
  };

  const showDirectionsAlert = (data) => {
    Alert.alert(
      '🗺️ Directions Found',
      `Route to ${data.destination.name}: ${Math.round(data.distance)}m away (${data.estimatedTime} min walk)`,
      [
        { text: 'OK' },
        { text: 'Start Navigation', onPress: () => handleStartNavigation(data) }
      ]
    );
  };

  const handleInitialize = async () => {
    setShowSetupModal(false);
    const result = await safeHavenService.initializeSafeHavenService(config);
    
    if (!result.success) {
      Alert.alert('Setup Failed', result.error);
    }
  };

  const handleSubmitReport = async () => {
    if (!report.description.trim()) {
      Alert.alert('Description Required', 'Please provide a brief description of this location.');
      return;
    }

    setShowReportModal(false);
    
    // TODO: Get current location for the report
    const mockLocation = {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01
    };

    const result = await safeHavenService.submitSafetyReport({
      ...report,
      location: mockLocation
    });

    if (!result.success) {
      Alert.alert('Report Failed', result.error);
    }
  };

  const handleFindNearestSafeHaven = async () => {
    // TODO: Get current location
    const mockLocation = {
      latitude: 37.7749,
      longitude: -122.4194
    };

    const result = await safeHavenService.getDirectionsToNearestSafeHaven(
      mockLocation, 
      null, // any type
      'medium' // medium urgency
    );

    if (!result.success) {
      Alert.alert('No Safe Havens Found', result.error);
    }
  };

  const handleStartNavigation = (directionsData) => {
    // TODO: Integrate with maps app or in-app navigation
    Alert.alert(
      'Navigation',
      'This would open your preferred maps app with directions to the safe haven.',
      [{ text: 'OK' }]
    );
  };

  const togglePreferredType = (type) => {
    const newTypes = config.preferredTypes.includes(type)
      ? config.preferredTypes.filter(t => t !== type)
      : [...config.preferredTypes, type];
    
    setConfig({ ...config, preferredTypes: newTypes });
  };

  const toggleAmenity = (amenity) => {
    const newAmenities = report.amenities.includes(amenity)
      ? report.amenities.filter(a => a !== amenity)
      : [...report.amenities, amenity];
    
    setReport({ ...report, amenities: newAmenities });
  };

  const getSafetyRatingColor = (rating) => {
    if (rating >= 8) return '#34C759';
    if (rating >= 6) return '#FF9500';
    if (rating >= 4) return '#FF6B6B';
    return '#FF3B30';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>Safe Haven Map</Text>
        </View>
        {isActive && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>{safeHavens.length} havens</Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>
        {isActive ? 
          `${safeHavens.length} safe havens and ${dangerZones.length} reported danger zones nearby` :
          'Crowdsourced safety map with verified safe locations'
        }
      </Text>

      {/* Nearest Safe Haven */}
      {nearestSafeHaven && (
        <View style={styles.nearestContainer}>
          <Text style={styles.nearestLabel}>Nearest Safe Haven:</Text>
          <View style={styles.nearestHaven}>
            <Text style={styles.nearestName}>
              {safeHavenTypes.find(t => t.id === nearestSafeHaven.category)?.emoji} {nearestSafeHaven.name}
            </Text>
            <Text style={styles.nearestDistance}>
              {Math.round((nearestSafeHaven.distance || 0) / 1000 * 10) / 10}km away
            </Text>
          </View>
        </View>
      )}

      {/* Quick Stats */}
      {isActive && (
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeHavens.filter(h => h.category === 'police').length}</Text>
            <Text style={styles.statLabel}>Police</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeHavens.filter(h => h.category === 'hospital').length}</Text>
            <Text style={styles.statLabel}>Medical</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{safeHavens.filter(h => h.category === 'store24h').length}</Text>
            <Text style={styles.statLabel}>24/7 Stores</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{dangerZones.length}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>
      )}

      {isActive ? (
        <View style={styles.activeControls}>
          <TouchableOpacity style={styles.findButton} onPress={handleFindNearestSafeHaven}>
            <Text style={styles.findButtonText}>🧭 Find Nearest</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportButton} onPress={() => setShowReportModal(true)}>
            <Text style={styles.reportButtonText}>📝 Report Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.setupButtonText}>Enable Safe Haven Map</Text>
        </TouchableOpacity>
      )}

      {/* Setup Modal */}
      <Modal
        visible={showSetupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Safe Haven Map Setup</Text>
              
              <Text style={styles.label}>Search radius:</Text>
              <View style={styles.radiusButtons}>
                {[500, 1000, 2000, 5000].map(radius => (
                  <TouchableOpacity
                    key={radius}
                    style={[styles.radiusButton, config.searchRadius === radius && styles.radiusButtonSelected]}
                    onPress={() => setConfig({...config, searchRadius: radius})}
                  >
                    <Text style={[styles.radiusButtonText, config.searchRadius === radius && styles.radiusButtonTextSelected]}>
                      {radius >= 1000 ? `${radius/1000}km` : `${radius}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Preferred safe haven types:</Text>
              <View style={styles.typesContainer}>
                {safeHavenTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeChip, config.preferredTypes.includes(type.id) && styles.typeChipSelected]}
                    onPress={() => togglePreferredType(type.id)}
                  >
                    <Text style={styles.typeEmoji}>{type.emoji}</Text>
                    <Text style={[styles.typeText, config.preferredTypes.includes(type.id) && styles.typeTextSelected]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Auto-update based on location</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.autoUpdate && styles.toggleActive]}
                  onPress={() => setConfig({...config, autoUpdate: !config.autoUpdate})}
                >
                  <View style={[styles.toggleThumb, config.autoUpdate && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Show danger zones</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.showDangerZones && styles.toggleActive]}
                  onPress={() => setConfig({...config, showDangerZones: !config.showDangerZones})}
                >
                  <View style={[styles.toggleThumb, config.showDangerZones && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleInitialize}>
                  <Text style={styles.confirmButtonText}>Enable Map</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Report Location</Text>
              
              <Text style={styles.label}>Report type:</Text>
              <View style={styles.reportTypeButtons}>
                <TouchableOpacity
                  style={[styles.reportTypeButton, report.type === 'safe_haven' && styles.reportTypeButtonSelected]}
                  onPress={() => setReport({...report, type: 'safe_haven'})}
                >
                  <Text style={[styles.reportTypeText, report.type === 'safe_haven' && styles.reportTypeTextSelected]}>
                    🛡️ Safe Haven
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reportTypeButton, report.type === 'danger_zone' && styles.reportTypeButtonSelected]}
                  onPress={() => setReport({...report, type: 'danger_zone'})}
                >
                  <Text style={[styles.reportTypeText, report.type === 'danger_zone' && styles.reportTypeTextSelected]}>
                    ⚠️ Danger Zone
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Category:</Text>
              <View style={styles.categoriesContainer}>
                {(report.type === 'safe_haven' ? safeHavenTypes : dangerZoneTypes).map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryChip, report.category === category.id && styles.categoryChipSelected]}
                    onPress={() => setReport({...report, category: category.id})}
                  >
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={[styles.categoryText, report.category === category.id && styles.categoryTextSelected]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {report.type === 'safe_haven' && (
                <>
                  <Text style={styles.label}>Available amenities:</Text>
                  <View style={styles.amenitiesContainer}>
                    {amenityOptions.map(amenity => (
                      <TouchableOpacity
                        key={amenity.id}
                        style={[styles.amenityChip, report.amenities.includes(amenity.id) && styles.amenityChipSelected]}
                        onPress={() => toggleAmenity(amenity.id)}
                      >
                        <Text style={[styles.amenityText, report.amenities.includes(amenity.id) && styles.amenityTextSelected]}>
                          {amenity.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Safety rating (1-10):</Text>
              <View style={styles.ratingButtons}>
                {[1, 3, 5, 7, 9].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton, 
                      report.rating === rating && styles.ratingButtonSelected,
                      { borderColor: getSafetyRatingColor(rating) }
                    ]}
                    onPress={() => setReport({...report, rating: rating})}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      report.rating === rating && { color: getSafetyRatingColor(rating) }
                    ]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description:</Text>
              <TextInput
                style={styles.descriptionInput}
                value={report.description}
                onChangeText={(text) => setReport({...report, description: text})}
                placeholder={`Describe this ${report.type.replace('_', ' ')}...`}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReportModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleSubmitReport}>
                  <Text style={styles.confirmButtonText}>Submit Report</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 24,
    marginRight: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  nearestContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  nearestLabel: {
    fontSize: 12,
    color: '#2d5a2d',
    marginBottom: 4
  },
  nearestHaven: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  nearestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5a2d',
    flex: 1
  },
  nearestDistance: {
    fontSize: 12,
    color: '#2d5a2d'
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12
  },
  findButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  findButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  setupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 8
  },
  radiusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  radiusButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  radiusButtonText: {
    fontSize: 12,
    color: '#666'
  },
  radiusButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600'
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  typeChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2'
  },
  typeEmoji: {
    fontSize: 14,
    marginRight: 6
  },
  typeText: {
    fontSize: 12,
    color: '#666'
  },
  typeTextSelected: {
    color: '#1976D2',
    fontWeight: '600'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333'
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E7',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  toggleActive: {
    backgroundColor: '#34C759'
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1
  },
  toggleThumbActive: {
    alignSelf: 'flex-end'
  },
  reportTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  reportTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  reportTypeButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2'
  },
  reportTypeText: {
    fontSize: 14,
    color: '#666'
  },
  reportTypeTextSelected: {
    color: '#1976D2',
    fontWeight: '600'
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  categoryChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2'
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 4
  },
  categoryText: {
    fontSize: 12,
    color: '#666'
  },
  categoryTextSelected: {
    color: '#1976D2',
    fontWeight: '600'
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16
  },
  amenityChip: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  amenityChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2'
  },
  amenityText: {
    fontSize: 11,
    color: '#666'
  },
  amenityTextSelected: {
    color: '#1976D2',
    fontWeight: '600'
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingButtonSelected: {
    backgroundColor: '#ffffff'
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default SafeHavenMap;