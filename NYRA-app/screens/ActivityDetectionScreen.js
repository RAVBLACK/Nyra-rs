import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text as RNText } from 'react-native';
import { Card, ProgressBar, Button, useTheme, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { LineChart } from 'react-native-chart-kit';
import {
  subscribeToSensorData,
} from '../services/sensorService';
import { getLatestActivity, subscribeToActivity } from '../services/harModelService';

const activityIcons = {
  IDLE: 'seat-recline-normal',
  STANDING: 'human-male',
  WALKING: 'walk',
  RUNNING: 'run',
  FALL: 'arrow-down-bold-box',
  CALIBRATING: 'progress-wrench',
};

const screenWidth = Dimensions.get('window').width;

const getChartConfig = (theme) => ({
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => {
    // Convert hex primary color to rgba
    const hex = theme.colors.primary.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: theme.colors.primary,
  },
  propsForBackgroundLines: {
    stroke: theme.colors.outline + '40', // Adding 40 for opacity
  }
});

const MemoizedLineChart = React.memo(({ data, theme }) => (
  <LineChart
    data={data}
    width={screenWidth - 64} // Adjust width to fit card padding
    height={220}
    chartConfig={getChartConfig(theme)}
    bezier
    withInnerLines={true}
    withOuterLines={false}
    withVerticalLabels={false}
    style={styles.chart}
  />
));

export default function ActivityDetectionScreen() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [currentActivity, setCurrentActivity] = useState({ name: 'IDLE', confidence: 1.0 });
  const [sensorData, setSensorData] = useState({
    labels: [],
    datasets: [{ data: [0], strokeWidth: 2 }],
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isProtectionActive, setIsProtectionActive] = useState(false);

  const activityIconRef = useRef(null);
  const lastActivityRef = useRef('IDLE'); // Track last activity to detect changes

  // Define handleActivityUpdate at component level so it can be used by test button
  const handleActivityUpdate = (newActivity) => {
    console.log(`Activity update received: ${newActivity.name} (was: ${lastActivityRef.current})`);
    
    // Always update the current activity state
    setCurrentActivity(newActivity);
    setIsProtectionActive(newActivity.isProtectionActive);
    
    // Only add to recent activities if the activity name actually changed
    if (newActivity.name !== lastActivityRef.current && newActivity.name !== 'CALIBRATING') {
      console.log(`Activity changed: ${lastActivityRef.current} → ${newActivity.name}`);
      setRecentActivities(prev => {
        const newEntry = { 
          name: newActivity.name, 
          confidence: newActivity.confidence,
          timestamp: new Date() 
        };
        return [newEntry, ...prev].slice(0, 5);
      });
      
      if (activityIconRef.current) {
        activityIconRef.current.pulse(800);
      }
    }
    
    // Update the ref with the new activity
    lastActivityRef.current = newActivity.name;
  };

  useEffect(() => {
    let sensorUnsubscribe;
    let activityUnsubscribe;

    if (isFocused) {
      // Subscribe to HAR model updates
      activityUnsubscribe = subscribeToActivity(handleActivityUpdate);
      
      // Set initial state
      const latestActivity = getLatestActivity();
      setCurrentActivity(latestActivity);
      setIsProtectionActive(latestActivity.isProtectionActive);


      // Subscribe to raw sensor data for the chart
      const dataBuffer = [];
      const handleSensorUpdate = ({ svm }) => {
        dataBuffer.push(svm);
        if (dataBuffer.length > 30) {
          dataBuffer.shift();
        }
        
        setSensorData({
          labels: [], // No labels needed for this chart
          datasets: [{ data: [...dataBuffer], strokeWidth: 2 }],
        });
      };
      sensorUnsubscribe = subscribeToSensorData(handleSensorUpdate);

    }

    return () => {
      if (sensorUnsubscribe) sensorUnsubscribe();
      if (activityUnsubscribe) activityUnsubscribe();
    };
  }, [isFocused, currentActivity.name]);

  const { name, confidence } = currentActivity;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Animatable.Text animation="fadeInDown" style={[styles.title, {color: theme.colors.onSurface}]}>Real-Time Activity</Animatable.Text>

        <Animatable.View animation="fadeInUp" delay={200}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Animatable.View ref={activityIconRef}>
                <RNText style={{fontSize: 60}}>
                  {isProtectionActive ? 
                    (name === 'IDLE' ? '🧘' : 
                     name === 'WALKING' ? '🚶‍♂️' : 
                     name === 'RUNNING' ? '🏃‍♂️' : 
                     name === 'STANDING' ? '🧍' : '🏃‍♂️') 
                    : '😴'}
                </RNText>
              </Animatable.View>
              <View style={styles.activityTextContainer}>
                <Text variant="displayMedium" style={{ color: isProtectionActive ? theme.colors.primary : theme.colors.onSurfaceDisabled }}>
                  {isProtectionActive ? name : 'INACTIVE'}
                </Text>
                <Text style={{ color: 'grey', marginTop: 4 }}>
                  {isProtectionActive ? `Confidence: ${(confidence * 100).toFixed(1)}%` : 'Protection is not running'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400}>
          <Card style={styles.card}>
            <Card.Title 
              title="Sensor Data (SVM)" 
              titleStyle={{color: theme.colors.onSurface}}
              subtitle="Real-time accelerometer magnitude"
              subtitleStyle={{color: theme.colors.onSurfaceVariant}}
            />
            <Card.Content>
              {isProtectionActive ? (
                <MemoizedLineChart data={sensorData} theme={theme} />
              ) : (
                <View style={[styles.placeholder, {backgroundColor: theme.colors.surfaceVariant}]}>
                  <RNText style={{fontSize: 40}}>📊</RNText>
                  <Text style={[styles.placeholderText, {color: theme.colors.onSurfaceVariant}]}>Start protection to see live sensor data</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </Animatable.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  card: {
    marginBottom: 24,
    borderRadius: 20,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  activityTextContainer: {
    marginLeft: 24,
    flex: 1,
  },
  placeholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginVertical: 8,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  chart: {
    borderRadius: 8,
  },
});