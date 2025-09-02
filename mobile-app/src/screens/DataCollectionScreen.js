import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Button, Card, Title, Paragraph, TextInput as PaperTextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useOffline } from '../contexts/OfflineContext';
import { saveFieldData } from '../services/api';
import { saveToLocalStorage, getFromLocalStorage } from '../utils/storage';

const DataCollectionScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const { isConnected } = useOffline();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      projectName: '',
      location: '',
      area: '',
      species: '',
      plantingDate: '',
      survivalRate: '',
      notes: '',
      gpsCoordinates: '',
    }
  });

  useEffect(() => {
    getCurrentLocation();
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    setIsOnline(isConnected);
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        console.log('Location:', { latitude, longitude });
      },
      (error) => {
        console.log('Location error:', error);
        Alert.alert('Location Error', 'Unable to get current location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        console.log('Camera error:', response.error);
        Alert.alert('Camera Error', 'Unable to take photo');
      } else {
        const newPhoto = {
          uri: response.assets[0].uri,
          timestamp: new Date().toISOString(),
          location: location,
        };
        setPhotos([...photos, newPhoto]);
      }
    });
  };

  const selectPhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled photo picker');
      } else if (response.error) {
        console.log('Photo picker error:', response.error);
        Alert.alert('Photo Error', 'Unable to select photo');
      } else {
        const newPhotos = response.assets.map(asset => ({
          uri: asset.uri,
          timestamp: new Date().toISOString(),
          location: location,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    });
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const onSubmit = async (data) => {
    if (!location) {
      Alert.alert('Location Required', 'Please wait for GPS location or enable location services');
      return;
    }

    if (photos.length === 0) {
      Alert.alert('Photos Required', 'Please take at least one photo of the project');
      return;
    }

    setLoading(true);

    const fieldData = {
      ...data,
      gpsCoordinates: `${location.latitude},${location.longitude}`,
      photos: photos,
      timestamp: new Date().toISOString(),
      deviceInfo: {
        platform: 'react-native',
        version: '1.0.0',
      },
    };

    try {
      if (isOnline) {
        // Submit to server
        await saveFieldData(fieldData);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Field data submitted successfully',
        });
        reset();
        setPhotos([]);
      } else {
        // Save offline
        const offlineData = await getFromLocalStorage('offlineFieldData') || [];
        offlineData.push(fieldData);
        await saveToLocalStorage('offlineFieldData', offlineData);
        
        Toast.show({
          type: 'info',
          text1: 'Saved Offline',
          text2: 'Data will be synced when connection is restored',
        });
        reset();
        setPhotos([]);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save field data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Field Data Collection</Title>
          <Paragraph>Collect blue carbon project data with GPS and photos</Paragraph>
        </Card.Content>
      </Card>

      {/* Connection Status */}
      <Card style={[styles.card, { backgroundColor: isOnline ? '#d1fae5' : '#fef3c7' }]}>
        <Card.Content>
          <View style={styles.statusRow}>
            <Icon 
              name={isOnline ? 'wifi' : 'wifi-off'} 
              size={20} 
              color={isOnline ? '#059669' : '#d97706'} 
            />
            <Text style={[styles.statusText, { color: isOnline ? '#059669' : '#d97706' }]}>
              {isOnline ? 'Online - Data will be synced immediately' : 'Offline - Data will be saved locally'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Location Status */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>GPS Location</Title>
          {location ? (
            <View>
              <Text style={styles.locationText}>
                Latitude: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Longitude: {location.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <Text style={styles.loadingText}>Getting location...</Text>
          )}
          <Button 
            mode="outlined" 
            onPress={getCurrentLocation}
            style={styles.button}
          >
            Refresh Location
          </Button>
        </Card.Content>
      </Card>

      {/* Photo Collection */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Project Photos</Title>
          <Paragraph>Take photos of the restoration area</Paragraph>
          
          <View style={styles.photoButtons}>
            <Button 
              mode="contained" 
              onPress={takePhoto}
              style={[styles.button, styles.photoButton]}
              icon="camera"
            >
              Take Photo
            </Button>
            <Button 
              mode="outlined" 
              onPress={selectPhoto}
              style={[styles.button, styles.photoButton]}
              icon="image"
            >
              Select Photo
            </Button>
          </View>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Icon name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Data Form */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Project Details</Title>
          
          <Controller
            control={control}
            rules={{ required: 'Project name is required' }}
            name="projectName"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Project Name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.projectName}
                style={styles.input}
              />
            )}
          />
          {errors.projectName && (
            <Text style={styles.errorText}>{errors.projectName.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: 'Location is required' }}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Location Description"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.location}
                style={styles.input}
              />
            )}
          />
          {errors.location && (
            <Text style={styles.errorText}>{errors.location.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: 'Area is required' }}
            name="area"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Area (square meters)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="numeric"
                error={!!errors.area}
                style={styles.input}
              />
            )}
          />
          {errors.area && (
            <Text style={styles.errorText}>{errors.area.message}</Text>
          )}

          <Controller
            control={control}
            name="species"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Species Planted"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="plantingDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Planting Date"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="survivalRate"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Survival Rate (%)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="numeric"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <PaperTextInput
                label="Additional Notes"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading || !location || photos.length === 0}
            style={styles.submitButton}
          >
            {isOnline ? 'Submit Data' : 'Save Offline'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  button: {
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  photoContainer: {
    position: 'relative',
    margin: 4,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
  },
});

export default DataCollectionScreen;
